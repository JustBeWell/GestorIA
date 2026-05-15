from __future__ import annotations

from datetime import date, timedelta

from psycopg2.extras import RealDictCursor

from database import db_connection
from service_config import settings
from services.notifications_service import NotificationsService


def register_jobs(scheduler) -> None:
    scheduler.add_job(scan_invoices_due_soon, "cron", hour=8, minute=0, id="scan_invoices_due_soon", replace_existing=True)
    scheduler.add_job(scan_invoices_due_today, "cron", hour=9, minute=0, id="scan_invoices_due_today", replace_existing=True)
    scheduler.add_job(scan_invoices_overdue_weekly, "cron", day_of_week="mon", hour=9, minute=0, id="scan_invoices_overdue_weekly", replace_existing=True)
    scheduler.add_job(scan_tasks_deadline, "cron", hour=8, minute=0, id="scan_tasks_deadline", replace_existing=True)


def scan_invoices_due_soon(today: date | None = None) -> int:
    base = today or date.today()
    return _scan_invoice_date(
        tipo="INV_DUE_SOON",
        target_date=base + timedelta(days=7),
        title_suffix="vence en 7 días",
        prioridad="media",
        logical_date=base,
    )


def scan_invoices_due_today(today: date | None = None) -> int:
    base = today or date.today()
    return _scan_invoice_date(
        tipo="INV_DUE_TODAY",
        target_date=base,
        title_suffix="vence hoy",
        prioridad="alta",
        logical_date=base,
    )


def scan_invoices_overdue_weekly(today: date | None = None) -> int:
    base = today or date.today()
    with db_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) AS total_facturas, COALESCE(SUM(f.total), 0) AS total_importe
                FROM facturas f
                WHERE f.estado IN ('emitida', 'pagada_parcial')
                  AND f.fecha_vencimiento IS NOT NULL
                  AND f.fecha_vencimiento < %s
                """,
                (base,),
            )
            summary = cursor.fetchone() or {}
            admins = _admin_user_ids(cursor)
    count = int(summary.get("total_facturas") or 0)
    if count == 0:
        return 0
    emitted = 0
    aggregate_id = "00000000-0000-0000-0000-000000000001"
    for admin_id in admins:
        if NotificationsService.emit(
            destinatario_id=admin_id,
            tipo="INV_OVERDUE_WEEKLY",
            prioridad="critica",
            titulo=f"Tienes {count} facturas vencidas",
            mensaje=f"Importe total pendiente: {float(summary.get('total_importe') or 0):.2f} €",
            entidad="factura",
            entidad_id=aggregate_id,
            deep_link="/pagos?vencidas_solo=true",
            metadata={"total_facturas": count, "total_importe": float(summary.get("total_importe") or 0)},
            dedupe_key=("INV_OVERDUE_WEEKLY", aggregate_id, base),
        ):
            emitted += 1
    return emitted


def scan_tasks_deadline(today: date | None = None) -> int:
    base = today or date.today()
    days = _deadline_days()
    with db_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id::text, fecha_objetivo
                FROM trabajos
                WHERE estado NOT IN ('finalizado', 'cancelado')
                  AND fecha_objetivo IS NOT NULL
                  AND fecha_objetivo >= %s
                  AND fecha_objetivo <= %s
                """,
                (base, base + timedelta(days=max(days or [0]))),
            )
            trabajos = [dict(row) for row in cursor.fetchall()]
    emitted = 0
    for trabajo in trabajos:
        remaining = (trabajo["fecha_objetivo"] - base).days
        if remaining == 0:
            tipo = "TASK_DEADLINE_TODAY"
        elif remaining in days:
            tipo = "TASK_DEADLINE_SOON"
        else:
            continue
        emitted += NotificationsService.emit_task_event(
            trabajo_id=trabajo["id"],
            tipo=tipo,
            payload={"dias": remaining, "fecha_objetivo": trabajo["fecha_objetivo"].isoformat()},
        )["emitidas"]
    return emitted


def _scan_invoice_date(
    tipo: str,
    target_date: date,
    title_suffix: str,
    prioridad: str,
    logical_date: date,
) -> int:
    with db_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    f.id::text,
                    f.numero,
                    f.total,
                    f.fecha_vencimiento,
                    c.nombre_fiscal
                FROM facturas f
                JOIN clientes c ON c.id = f.cliente_id
                WHERE f.fecha_vencimiento = %s
                  AND f.estado IN ('emitida', 'pagada_parcial')
                """,
                (target_date,),
            )
            facturas = [dict(row) for row in cursor.fetchall()]
            admins = _admin_user_ids(cursor)

    emitted = 0
    for factura in facturas:
        for admin_id in admins:
            if NotificationsService.emit(
                destinatario_id=admin_id,
                tipo=tipo,
                prioridad=prioridad,
                titulo=f"Factura {factura['numero']} {title_suffix}",
                mensaje=f"{factura['nombre_fiscal']} - {float(factura['total'] or 0):.2f} € pendiente",
                entidad="factura",
                entidad_id=factura["id"],
                deep_link=f"/pagos/{factura['id']}",
                metadata={
                    "numero": factura["numero"],
                    "total": float(factura["total"] or 0),
                    "fecha_vencimiento": factura["fecha_vencimiento"].isoformat(),
                },
                dedupe_key=(tipo, factura["id"], logical_date),
            ):
                emitted += 1
    return emitted


def _admin_user_ids(cursor: RealDictCursor) -> list[str]:
    cursor.execute("SELECT id::text FROM usuarios WHERE rol = 'administrador' AND activo = TRUE")
    return [row["id"] for row in cursor.fetchall()]


def _deadline_days() -> list[int]:
    values: list[int] = []
    for raw in settings.task_deadline_days_ahead.split(","):
        raw = raw.strip()
        if raw:
            values.append(int(raw))
    return values or [3, 1]
