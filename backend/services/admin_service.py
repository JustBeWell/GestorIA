from datetime import datetime

from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import MADRID_TZ, MONTH_ABBR, normalize_pagination, build_pagination_meta
from services.fichaje_service import FichajeService

MONTH_ABBR_ES = MONTH_ABBR


class AdminService:

    @staticmethod
    def get_admin_resumen() -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                today = datetime.now(MADRID_TZ).date()
                mes_inicio = today.replace(day=1)
                mes_fin = today

                cursor.execute(
                    """
                    SELECT
                        e.id::text AS empleado_id,
                        u.id::text AS usuario_id,
                        e.nombre,
                        e.apellidos,
                        u.rol::text AS rol,
                        e.activo,
                        u.mfa_habilitado
                    FROM empleados e
                    JOIN usuarios u ON u.id = e.usuario_id
                    ORDER BY e.apellidos, e.nombre
                    """,
                )
                empleados_rows = cursor.fetchall()

                empleados = []
                for emp in empleados_rows:
                    emp_id = emp["empleado_id"]
                    usuario_id = emp["usuario_id"]
                    cursor.execute(
                        """
                        SELECT tipo_evento, fecha_hora
                        FROM fichajes
                        WHERE empleado_id = %s
                        AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') BETWEEN %s AND %s
                        ORDER BY fecha_hora ASC
                        """,
                        (emp_id, mes_inicio.isoformat(), mes_fin.isoformat()),
                    )
                    eventos = cursor.fetchall()
                    horas_mes = FichajeService.build_fichaje_hours_by_month(
                        [dict(ev) for ev in eventos], mes_inicio, mes_fin
                    )
                    total_horas = sum(horas_mes.values())

                    fichaje = FichajeService.get_fichaje_resumen(cursor, emp_id)

                    cursor.execute(
                        """
                        SELECT
                            COUNT(*) FILTER (WHERE t.estado = 'en_curso') AS en_curso,
                            COUNT(*) FILTER (WHERE t.estado = 'pendiente') AS pendientes,
                            COUNT(*) FILTER (WHERE t.estado = 'bloqueado') AS bloqueados
                        FROM trabajo_empleado te
                        JOIN trabajos t ON t.id = te.trabajo_id
                        WHERE te.empleado_id = %s
                        AND te.desasignado_en IS NULL
                        AND t.estado NOT IN ('finalizado', 'cancelado')
                        """,
                        (emp_id,),
                    )
                    trabajos_row = cursor.fetchone() or {}

                    empleados.append({
                        "empleado_id": emp_id,
                        "usuario_id": usuario_id,
                        "nombre_completo": f"{emp['nombre']} {emp['apellidos']}".strip(),
                        "rol": emp["rol"],
                        "activo": emp["activo"],
                        "mfa_habilitado": bool(emp.get("mfa_habilitado", False)),
                        "horas_mes": round(total_horas, 1),
                        "turno_activo": fichaje["turno_activo"],
                        "trabajos_en_curso": int(trabajos_row.get("en_curso") or 0),
                        "trabajos_pendientes": int(trabajos_row.get("pendientes") or 0),
                        "trabajos_bloqueados": int(trabajos_row.get("bloqueados") or 0),
                    })

                cursor.execute(
                    """
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE estado = 'en_curso') AS en_curso,
                        COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
                        COUNT(*) FILTER (WHERE estado = 'bloqueado') AS bloqueados,
                        COUNT(*) FILTER (WHERE estado = 'finalizado') AS finalizados,
                        COUNT(*) FILTER (WHERE estado = 'cancelado') AS cancelados
                    FROM trabajos
                    """,
                )
                trabajos_global = cursor.fetchone() or {}

                cursor.execute(
                    """
                    SELECT
                        COUNT(*) FILTER (
                            WHERE estado IN ('emitida', 'pagada_parcial')
                            AND fecha_vencimiento < CURRENT_DATE
                        ) AS facturas_vencidas,
                        COALESCE(SUM(total) FILTER (WHERE estado = 'pagada'), 0) AS cobrado_total,
                        COALESCE(SUM(total) FILTER (
                            WHERE estado IN ('emitida', 'pagada_parcial')
                        ), 0) AS pendiente_total,
                        COUNT(DISTINCT cliente_id) AS clientes_con_facturas
                    FROM facturas
                    """,
                )
                facturacion = cursor.fetchone() or {}

                cursor.execute(
                    "SELECT COUNT(*) FILTER (WHERE activo) AS activos, COUNT(*) AS total FROM clientes"
                )
                clientes_global = cursor.fetchone() or {}

        return {
            "empleados": empleados,
            "trabajos": {
                "total": int(trabajos_global.get("total") or 0),
                "en_curso": int(trabajos_global.get("en_curso") or 0),
                "pendientes": int(trabajos_global.get("pendientes") or 0),
                "bloqueados": int(trabajos_global.get("bloqueados") or 0),
                "finalizados": int(trabajos_global.get("finalizados") or 0),
                "cancelados": int(trabajos_global.get("cancelados") or 0),
            },
            "facturacion": {
                "facturas_vencidas": int(facturacion.get("facturas_vencidas") or 0),
                "cobrado_total": float(facturacion.get("cobrado_total") or 0),
                "pendiente_total": float(facturacion.get("pendiente_total") or 0),
                "clientes_con_facturas": int(facturacion.get("clientes_con_facturas") or 0),
            },
            "clientes": {
                "total": int(clientes_global.get("total") or 0),
                "activos": int(clientes_global.get("activos") or 0),
            },
        }

    @staticmethod
    def get_admin_charts(months: int = 12) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:

                cursor.execute(
                    """
                    WITH meses AS (
                        SELECT generate_series(
                            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * (%s - 1)),
                            DATE_TRUNC('month', CURRENT_DATE),
                            '1 month'
                        )::date AS mes
                    ),
                    fac AS (SELECT * FROM v_facturacion_mensual),
                    cob AS (SELECT * FROM v_cobros_mensuales)
                    SELECT
                        TO_CHAR(m.mes, 'YYYY-MM')               AS mes,
                        COALESCE(fac.facturado_total, 0)         AS facturado_total,
                        COALESCE(cob.cobrado_total, 0)           AS cobrado_total,
                        COALESCE(fac.facturas_emitidas::int, 0)  AS facturas_emitidas,
                        COALESCE(fac.facturas_vencidas::int, 0)  AS facturas_vencidas
                    FROM meses m
                    LEFT JOIN fac ON fac.mes = m.mes
                    LEFT JOIN cob ON cob.mes = m.mes
                    ORDER BY m.mes
                    """,
                    (months,),
                )
                facturacion_rows = cursor.fetchall()

                cursor.execute(
                    """
                    WITH meses AS (
                        SELECT generate_series(
                            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * (%s - 1)),
                            DATE_TRUNC('month', CURRENT_DATE),
                            '1 month'
                        )::date AS mes
                    )
                    SELECT
                        TO_CHAR(m.mes, 'YYYY-MM')                   AS mes,
                        COALESCE(v.trabajos_creados::int, 0)         AS trabajos_creados,
                        COALESCE(v.finalizados::int, 0)              AS finalizados,
                        COALESCE(v.cancelados::int, 0)               AS cancelados,
                        COALESCE(v.bloqueados::int, 0)               AS bloqueados
                    FROM meses m
                    LEFT JOIN v_trabajos_mensuales v ON v.mes = m.mes
                    ORDER BY m.mes
                    """,
                    (months,),
                )
                trabajos_rows = cursor.fetchall()

                cursor.execute(
                    """
                    WITH meses AS (
                        SELECT generate_series(
                            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * (%s - 1)),
                            DATE_TRUNC('month', CURRENT_DATE),
                            '1 month'
                        )::date AS mes
                    )
                    SELECT
                        TO_CHAR(m.mes, 'YYYY-MM')               AS mes,
                        COALESCE(v.clientes_nuevos::int, 0)      AS clientes_nuevos
                    FROM meses m
                    LEFT JOIN v_clientes_mensuales v ON v.mes = m.mes
                    ORDER BY m.mes
                    """,
                    (months,),
                )
                clientes_rows = cursor.fetchall()

                cursor.execute(
                    """
                    WITH meses AS (
                        SELECT generate_series(
                            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * (%s - 1)),
                            DATE_TRUNC('month', CURRENT_DATE),
                            '1 month'
                        )::date AS mes
                    )
                    SELECT
                        TO_CHAR(m.mes, 'YYYY-MM')               AS mes,
                        COALESCE(v.horas_totales, 0)             AS horas_totales
                    FROM meses m
                    LEFT JOIN v_horas_mensuales v ON v.mes = m.mes
                    ORDER BY m.mes
                    """,
                    (months,),
                )
                horas_rows = cursor.fetchall()

        def label(r: dict) -> str:
            return AdminService._mes_label(r["mes"])

        return {
            "facturacion": [
                {
                    "mes": r["mes"],
                    "label": label(r),
                    "facturado_total": float(r["facturado_total"]),
                    "cobrado_total": float(r["cobrado_total"]),
                    "facturas_emitidas": int(r["facturas_emitidas"]),
                    "facturas_vencidas": int(r["facturas_vencidas"]),
                }
                for r in facturacion_rows
            ],
            "cobros": [
                {
                    "mes": r["mes"],
                    "label": label(r),
                    "facturado_total": 0.0,
                    "cobrado_total": float(r["cobrado_total"]),
                    "facturas_emitidas": 0,
                    "facturas_vencidas": 0,
                }
                for r in facturacion_rows
            ],
            "trabajos": [
                {
                    "mes": r["mes"],
                    "label": label(r),
                    "trabajos_creados": int(r["trabajos_creados"]),
                    "finalizados": int(r["finalizados"]),
                    "cancelados": int(r["cancelados"]),
                    "bloqueados": int(r["bloqueados"]),
                }
                for r in trabajos_rows
            ],
            "clientes": [
                {
                    "mes": r["mes"],
                    "label": label(r),
                    "clientes_nuevos": int(r["clientes_nuevos"]),
                }
                for r in clientes_rows
            ],
            "horas": [
                {
                    "mes": r["mes"],
                    "label": label(r),
                    "horas_totales": float(r["horas_totales"]),
                }
                for r in horas_rows
            ],
        }

    @staticmethod
    def get_admin_fichajes(
        page: int = 1,
        page_size: int = 30,
        empleado_id: str | None = None,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
        tipo_evento: str | None = None,
    ) -> dict:
        page, page_size, offset = normalize_pagination(page, page_size)

        conditions: list[str] = []
        values: list = []

        if empleado_id:
            conditions.append("f.empleado_id::text = %s")
            values.append(empleado_id)
        if tipo_evento:
            conditions.append("f.tipo_evento::text = %s")
            values.append(tipo_evento)
        if fecha_desde:
            conditions.append("DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid') >= %s")
            values.append(fecha_desde)
        if fecha_hasta:
            conditions.append("DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid') <= %s")
            values.append(fecha_hasta)

        where = " AND ".join(conditions) if conditions else "TRUE"

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    f"SELECT COUNT(*) AS total FROM fichajes f WHERE {where}",
                    values,
                )
                total = int((cursor.fetchone() or {}).get("total") or 0)

                cursor.execute(
                    f"""
                    SELECT
                        f.id::text AS fichaje_id,
                        e.id::text AS empleado_id,
                        e.nombre || ' ' || e.apellidos AS nombre_completo,
                        f.tipo_evento::text AS tipo_evento,
                        f.fecha_hora,
                        f.origen::text AS origen,
                        f.observaciones
                    FROM fichajes f
                    JOIN empleados e ON e.id = f.empleado_id
                    WHERE {where}
                    ORDER BY f.fecha_hora DESC
                    LIMIT %s OFFSET %s
                    """,
                    values + [page_size, offset],
                )
                fichajes = [dict(row) for row in cursor.fetchall()]

                cursor.execute(
                    """
                    SELECT e.id::text AS empleado_id,
                           e.nombre || ' ' || e.apellidos AS nombre_completo
                    FROM empleados e
                    ORDER BY e.apellidos, e.nombre
                    """,
                )
                empleados = [dict(row) for row in cursor.fetchall()]

        return {
            "fichajes": fichajes,
            "empleados": empleados,
            "paginacion": build_pagination_meta(page, page_size, total),
        }

    @staticmethod
    def create_correccion(
        empleado_id: str,
        tipo_evento: str,
        fecha_hora: datetime,
        observaciones: str | None,
    ) -> dict:
        from fastapi import HTTPException

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT e.id::text AS empleado_id,
                           e.nombre || ' ' || e.apellidos AS nombre_completo
                    FROM empleados e
                    WHERE e.id::text = %s
                    """,
                    (empleado_id,),
                )
                emp = cursor.fetchone()
                if not emp:
                    raise HTTPException(status_code=404, detail="Empleado no encontrado")

                cursor.execute(
                    """
                    INSERT INTO fichajes (empleado_id, tipo_evento, origen, observaciones, fecha_hora)
                    VALUES (%s::uuid, %s::tipo_evento_fichaje, 'correccion'::origen_fichaje, %s, %s)
                    RETURNING
                        id::text AS fichaje_id,
                        empleado_id::text AS empleado_id,
                        tipo_evento::text AS tipo_evento,
                        fecha_hora,
                        origen::text AS origen,
                        observaciones
                    """,
                    (empleado_id, tipo_evento, observaciones, fecha_hora),
                )
                row = dict(cursor.fetchone())
            connection.commit()

        return {
            "fichaje_id": row["fichaje_id"],
            "empleado_id": row["empleado_id"],
            "nombre_completo": emp["nombre_completo"],
            "tipo_evento": row["tipo_evento"],
            "fecha_hora": row["fecha_hora"],
            "origen": row["origen"],
            "observaciones": row["observaciones"],
        }

    @staticmethod
    def _mes_label(mes_str: str) -> str:
        try:
            year, month = mes_str.split("-")
            return f"{MONTH_ABBR_ES[int(month) - 1].capitalize()} {year}"
        except Exception:
            return mes_str

    @staticmethod
    def get_cierre_mensual(year: int, month: int) -> dict:
        periodo = f"{year}-{month:02d}"
        fecha_inicio = f"{year}-{month:02d}-01"
        if month == 12:
            fecha_fin = f"{year + 1}-01-01"
        else:
            fecha_fin = f"{year}-{month + 1:02d}-01"

        with db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM v_resumen_mensual WHERE periodo = %s",
                    (periodo,),
                )
                row = cur.fetchone()
                resumen = dict(row) if row else {
                    "total_facturado": 0,
                    "total_cobrado": 0,
                    "trabajos_nuevos": 0,
                    "trabajos_cerrados": 0,
                    "clientes_nuevos": 0,
                    "horas_trabajadas": 0,
                }
                for k in ("total_facturado", "total_cobrado"):
                    if k in resumen and resumen[k] is not None:
                        resumen[k] = float(resumen[k])

                cur.execute(
                    """
                    SELECT
                        f.numero,
                        c.nombre_fiscal AS cliente_nombre,
                        f.estado::text AS estado,
                        f.total,
                        GREATEST(f.total - COALESCE(SUM(p.importe), 0), 0) AS pendiente
                    FROM facturas f
                    JOIN clientes c ON c.id = f.cliente_id
                    LEFT JOIN pagos p ON p.factura_id = f.id
                    WHERE f.fecha_emision >= %s AND f.fecha_emision < %s
                    GROUP BY f.id, f.numero, c.nombre_fiscal, f.estado, f.total
                    ORDER BY f.fecha_emision DESC
                    LIMIT 200
                    """,
                    (fecha_inicio, fecha_fin),
                )
                facturas = [
                    {**dict(r), "total": float(r["total"] or 0), "pendiente": float(r["pendiente"] or 0)}
                    for r in cur.fetchall()
                ]

        return {"resumen": resumen, "facturas": facturas}

    @staticmethod
    def get_auditoria(
        page: int = 1,
        page_size: int = 50,
        entidad: str | None = None,
        actor_id: str | None = None,
        accion: str | None = None,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
    ) -> dict:
        filters = []
        params: list = []

        if entidad:
            filters.append("entidad = %s")
            params.append(entidad)
        if actor_id:
            filters.append("actor_id = %s::uuid")
            params.append(actor_id)
        if accion:
            filters.append("accion = %s::accion_auditoria")
            params.append(accion)
        if fecha_desde:
            filters.append("created_at >= %s::timestamptz")
            params.append(fecha_desde)
        if fecha_hasta:
            filters.append("created_at < (%s::date + interval '1 day')::timestamptz")
            params.append(fecha_hasta)

        where_clause = ("WHERE " + " AND ".join(filters)) if filters else ""
        offset = (page - 1) * page_size

        with db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"SELECT COUNT(*) AS total FROM auditoria_eventos {where_clause}",
                    params,
                )
                total = cur.fetchone()["total"]

                cur.execute(
                    f"""
                    SELECT
                        id::text           AS evento_id,
                        actor_id::text     AS actor_id,
                        actor_nombre,
                        entidad,
                        entidad_id,
                        accion::text       AS accion,
                        detalle_json,
                        ip,
                        created_at
                    FROM auditoria_eventos
                    {where_clause}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    [*params, page_size, offset],
                )
                eventos = [dict(r) for r in cur.fetchall()]

        total_pages = max(1, -(-total // page_size))  # ceiling division
        return {
            "eventos": eventos,
            "paginacion": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            },
        }
