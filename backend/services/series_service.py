from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import MADRID_TZ, MONTH_ABBR, get_usuario
from services.fichaje_service import FichajeService


class SeriesService:

    @staticmethod
    def get_fichaje_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = SeriesService._get_quarter_months()
                eventos = FichajeService.get_fichajes_all(
                    cursor,
                    empleado_id=empleado_id,
                    tipo_evento=None,
                    fecha_desde=start_date.isoformat(),
                    fecha_hasta=end_date.isoformat(),
                    order_desc=False,
                )
                hours_by_month = FichajeService.build_fichaje_hours_by_month(eventos, start_date, end_date)

        points = [
            {"label": w["label"], "value": float(hours_by_month.get(w["key"], 0))}
            for w in month_windows
        ]
        return {"start": start_date, "end": end_date, "granularity": "month", "points": points}

    @staticmethod
    def get_clientes_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = SeriesService._get_quarter_months()
                points = []
                for window in month_windows:
                    month_end = window["end"]
                    cursor.execute(
                        """
                        WITH clientes_asignados AS (
                            SELECT DISTINCT t.cliente_id
                            FROM trabajo_empleado te
                            JOIN trabajos t ON t.id = te.trabajo_id
                            WHERE te.empleado_id = %s
                            AND te.asignado_en::date <= %s
                            AND (te.desasignado_en IS NULL OR te.desasignado_en::date > %s)
                        )
                        SELECT COUNT(*) FILTER (WHERE activo = TRUE AND created_at::date <= %s) AS activos
                        FROM clientes
                        WHERE id IN (SELECT cliente_id FROM clientes_asignados)
                        """,
                        (empleado_id, month_end, month_end, month_end),
                    )
                    row = cursor.fetchone() or {}
                    points.append({"label": window["label"], "value": float(row.get("activos") or 0)})

        return {"start": start_date, "end": end_date, "granularity": "month", "points": points}

    @staticmethod
    def get_trabajos_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = SeriesService._get_quarter_months()
                points = []
                for window in month_windows:
                    month_start = window["start"]
                    month_end = window["end"]
                    cursor.execute(
                        """
                        SELECT COUNT(DISTINCT t.id) AS total
                        FROM trabajo_empleado te
                        JOIN trabajos t ON t.id = te.trabajo_id
                        WHERE te.empleado_id = %s
                        AND t.estado = 'finalizado'
                        AND t.fecha_cierre BETWEEN %s AND %s
                        AND te.asignado_en::date <= %s
                        AND (te.desasignado_en IS NULL OR te.desasignado_en::date >= %s)
                        """,
                        (empleado_id, month_start, month_end, month_end, month_start),
                    )
                    row = cursor.fetchone() or {}
                    points.append({"label": window["label"], "value": float(row.get("total") or 0)})

        return {"start": start_date, "end": end_date, "granularity": "month", "points": points}

    @staticmethod
    def get_pagos_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = SeriesService._get_quarter_months()
                points = []
                for window in month_windows:
                    month_start = window["start"]
                    month_end = window["end"]
                    cursor.execute(
                        """
                        WITH clientes_asignados AS (
                            SELECT DISTINCT t.cliente_id
                            FROM trabajo_empleado te
                            JOIN trabajos t ON t.id = te.trabajo_id
                            WHERE te.empleado_id = %s
                            AND te.asignado_en::date <= %s
                            AND (te.desasignado_en IS NULL OR te.desasignado_en::date > %s)
                        )
                        SELECT COALESCE(SUM(f.total), 0) AS total
                        FROM facturas f
                        WHERE f.cliente_id IN (SELECT cliente_id FROM clientes_asignados)
                        AND f.estado <> 'anulada'
                        AND f.fecha_emision BETWEEN %s AND %s
                        """,
                        (empleado_id, month_end, month_end, month_start, month_end),
                    )
                    row = cursor.fetchone() or {}
                    points.append({"label": window["label"], "value": float(row.get("total") or 0)})

        return {"start": start_date, "end": end_date, "granularity": "month", "points": points}

    # ── Private helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _get_quarter_months() -> tuple[date, date, list[dict]]:
        today = datetime.now(MADRID_TZ).date()
        first_month = SeriesService._shift_month(today.replace(day=1), -2)
        months = []
        for offset in range(3):
            month_start = SeriesService._shift_month(first_month, offset)
            month_end = min(SeriesService._month_end(month_start), today)
            key = f"{month_start.year:04d}-{month_start.month:02d}"
            months.append({
                "key": key,
                "label": f"{MONTH_ABBR[month_start.month - 1]} {month_start.year}",
                "start": month_start,
                "end": month_end,
            })
        return first_month, months[-1]["end"], months

    @staticmethod
    def _shift_month(value: date, delta: int) -> date:
        total = value.year * 12 + (value.month - 1) + delta
        return date(total // 12, total % 12 + 1, 1)

    @staticmethod
    def _month_end(value: date) -> date:
        return SeriesService._shift_month(value, 1) - timedelta(days=1)
