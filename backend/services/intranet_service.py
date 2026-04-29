from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from database import db_connection


class IntranetService:
    MADRID_TZ = ZoneInfo("Europe/Madrid")
    MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    @staticmethod
    def get_home(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                fichaje = IntranetService._get_fichaje_resumen(cursor, empleado_id)
                clientes = IntranetService._get_clientes_resumen(cursor, empleado_id)
                trabajos = IntranetService._get_trabajos_resumen(cursor, empleado_id)
                pagos = IntranetService._get_pagos_resumen(cursor, empleado_id)

        return {
            "usuario": {
                "usuario_id": usuario["usuario_id"],
                "empleado_id": usuario["empleado_id"],
                "nombre_usuario": usuario["nombre_usuario"],
                "nombre_completo": f"{usuario['nombre']} {usuario['apellidos']}".strip(),
                "rol": usuario["rol"],
            },
            "funcionalidades": [
                {
                    "clave": "fichaje",
                    "titulo": "Fichaje",
                    "descripcion": "Registro diario de entrada y salida de jornada laboral.",
                    "ruta": "/fichaje",
                },
                {
                    "clave": "clientes",
                    "titulo": "Gestión de clientes",
                    "descripcion": "Consulta y administración de clientes activos e históricos.",
                    "ruta": "/clientes",
                },
                {
                    "clave": "trabajos",
                    "titulo": "Gestión de trabajos",
                    "descripcion": "Seguimiento de expedientes, estados y prioridades de trabajos.",
                    "ruta": "/trabajos",
                },
                {
                    "clave": "pagos",
                    "titulo": "Pagos",
                    "descripcion": "Control de cobros, facturas pendientes y vencimientos.",
                    "ruta": "/pagos",
                },
            ],
            "fichaje": fichaje,
            "clientes": clientes,
            "trabajos": trabajos,
            "pagos": pagos,
        }

    @staticmethod
    def get_fichaje_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = IntranetService._get_quarter_months()
                eventos = IntranetService._get_fichajes_all(
                    cursor,
                    empleado_id=empleado_id,
                    tipo_evento=None,
                    fecha_desde=start_date.isoformat(),
                    fecha_hasta=end_date.isoformat(),
                    order_desc=False,
                )
                hours_by_month = IntranetService._build_fichaje_hours_by_month(eventos, start_date, end_date)

        points = [
            {
                "label": window["label"],
                "value": float(hours_by_month.get(window["key"], 0)),
            }
            for window in month_windows
        ]
        return {
            "start": start_date,
            "end": end_date,
            "granularity": "month",
            "points": points,
        }

    @staticmethod
    def get_clientes_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = IntranetService._get_quarter_months()
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
                        SELECT
                            COUNT(*) FILTER (WHERE activo = TRUE AND created_at::date <= %s) AS activos
                        FROM clientes
                        WHERE id IN (SELECT cliente_id FROM clientes_asignados)
                        """,
                        (empleado_id, month_end, month_end, month_end),
                    )
                    row = cursor.fetchone() or {}
                    points.append({
                        "label": window["label"],
                        "value": float(row.get("activos") or 0),
                    })

        return {
            "start": start_date,
            "end": end_date,
            "granularity": "month",
            "points": points,
        }

    @staticmethod
    def get_trabajos_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = IntranetService._get_quarter_months()
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
                    points.append({
                        "label": window["label"],
                        "value": float(row.get("total") or 0),
                    })

        return {
            "start": start_date,
            "end": end_date,
            "granularity": "month",
            "points": points,
        }

    @staticmethod
    def get_pagos_quarter_series(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                start_date, end_date, month_windows = IntranetService._get_quarter_months()
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
                    points.append({
                        "label": window["label"],
                        "value": float(row.get("total") or 0),
                    })

        return {
            "start": start_date,
            "end": end_date,
            "granularity": "month",
            "points": points,
        }

    @staticmethod
    def _get_quarter_months() -> tuple[date, date, list[dict]]:
        today = datetime.now(IntranetService.MADRID_TZ).date()
        first_month = IntranetService._shift_month(today.replace(day=1), -2)
        months = []

        for offset in range(3):
            month_start = IntranetService._shift_month(first_month, offset)
            month_end = IntranetService._month_end(month_start)
            month_end = min(month_end, today)
            key = f"{month_start.year:04d}-{month_start.month:02d}"
            months.append({
                "key": key,
                "label": f"{IntranetService.MONTH_ABBR[month_start.month - 1]} {month_start.year}",
                "start": month_start,
                "end": month_end,
            })

        return first_month, months[-1]["end"], months

    @staticmethod
    def _shift_month(value: date, delta: int) -> date:
        total = value.year * 12 + (value.month - 1) + delta
        year = total // 12
        month = total % 12 + 1
        return date(year, month, 1)

    @staticmethod
    def _month_end(value: date) -> date:
        next_month = IntranetService._shift_month(value, 1)
        return next_month - timedelta(days=1)

    @staticmethod
    def _build_fichaje_hours_by_month(
        eventos: list[dict],
        start_date: date,
        end_date: date,
    ) -> dict[str, float]:
        eventos_por_dia: dict[str, list[dict]] = {}
        for evento in eventos:
            fecha_hora: datetime = evento["fecha_hora"]
            local_date = fecha_hora.astimezone(IntranetService.MADRID_TZ).date()
            if local_date < start_date or local_date > end_date:
                continue
            key = local_date.isoformat()
            eventos_por_dia.setdefault(key, []).append(evento)

        for items in eventos_por_dia.values():
            items.sort(key=lambda item: item["fecha_hora"])

        hours_by_month: dict[str, float] = {}
        for key, day_events in eventos_por_dia.items():
            entry = next((event for event in day_events if event["tipo_evento"] == "entrada"), None)
            exit_event = next((event for event in day_events if event["tipo_evento"] == "salida"), None)
            if not entry or not exit_event:
                continue

            pause_minutes = IntranetService._calculate_pause_minutes(day_events)
            diff_hours = max(0, (exit_event["fecha_hora"] - entry["fecha_hora"]).total_seconds() / 3600 - (pause_minutes / 60))
            day_date = date.fromisoformat(key)
            month_key = f"{day_date.year:04d}-{day_date.month:02d}"
            hours_by_month[month_key] = hours_by_month.get(month_key, 0) + diff_hours

        return {key: round(value, 1) for key, value in hours_by_month.items()}

    @staticmethod
    def get_fichaje_tab(user_id: str) -> dict:
        return IntranetService.get_fichaje_tab_filtered(user_id)

    @staticmethod
    def create_fichaje_event(
        user_id: str,
        tipo_evento: str | None,
        observaciones: str | None,
        origen: str = "web",
    ) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]

                estado_hoy = IntranetService._get_fichaje_estado_hoy(cursor, empleado_id)
                ultimo_evento_hoy = IntranetService._get_ultimo_evento_hoy(cursor, empleado_id)

                if not tipo_evento:
                    if estado_hoy["entradas"] == 0:
                        tipo_evento = "entrada"
                    elif estado_hoy["salidas"] == 0:
                        if ultimo_evento_hoy == "pausa_inicio":
                            raise HTTPException(
                                status_code=400,
                                detail="Finaliza la pausa antes de registrar la salida.",
                            )
                        tipo_evento = "salida"
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail="Ya existe una entrada y una salida registradas para hoy.",
                        )
                else:
                    if tipo_evento == "entrada" and estado_hoy["entradas"] >= 1:
                        raise HTTPException(
                            status_code=400,
                            detail="Ya existe una entrada registrada para hoy.",
                        )
                    if tipo_evento == "salida" and estado_hoy["salidas"] >= 1:
                        raise HTTPException(
                            status_code=400,
                            detail="Ya existe una salida registrada para hoy.",
                        )
                    if tipo_evento == "salida" and estado_hoy["entradas"] == 0:
                        raise HTTPException(
                            status_code=400,
                            detail="No se puede registrar una salida sin una entrada previa hoy.",
                        )
                    if tipo_evento == "salida" and ultimo_evento_hoy == "pausa_inicio":
                        raise HTTPException(
                            status_code=400,
                            detail="Finaliza la pausa antes de registrar la salida.",
                        )
                    if tipo_evento in {"pausa_inicio", "pausa_fin"}:
                        if estado_hoy["entradas"] == 0:
                            raise HTTPException(
                                status_code=400,
                                detail="No se puede registrar una pausa sin una entrada previa hoy.",
                            )
                        if estado_hoy["salidas"] >= 1:
                            raise HTTPException(
                                status_code=400,
                                detail="No se puede registrar una pausa cuando el turno ya esta cerrado.",
                            )
                        if tipo_evento == "pausa_inicio" and ultimo_evento_hoy == "pausa_inicio":
                            raise HTTPException(
                                status_code=400,
                                detail="Ya hay una pausa en curso.",
                            )
                        if tipo_evento == "pausa_fin" and ultimo_evento_hoy != "pausa_inicio":
                            raise HTTPException(
                                status_code=400,
                                detail="No hay una pausa en curso para finalizar.",
                            )

                cursor.execute(
                    """
                    INSERT INTO fichajes (empleado_id, tipo_evento, origen, observaciones)
                    VALUES (%s, %s::tipo_evento_fichaje, %s::origen_fichaje, %s)
                    RETURNING
                        id::text AS id,
                        tipo_evento::text AS tipo_evento,
                        fecha_hora,
                        origen::text AS origen,
                        observaciones
                    """,
                    (empleado_id, tipo_evento, origen, observaciones),
                )
                evento = cursor.fetchone()
                resumen = IntranetService._get_fichaje_resumen(cursor, empleado_id)

            connection.commit()

        return {
            "evento": dict(evento) if evento else {},
            "resumen": resumen,
        }

    @staticmethod
    def get_fichaje_tab_filtered(
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        tipo_evento: str | None = None,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
    ) -> dict:
        page, page_size, offset = IntranetService._normalize_pagination(page, page_size)
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = IntranetService._get_fichaje_resumen(cursor, empleado_id)
                total = IntranetService._count_fichajes(
                    cursor,
                    empleado_id,
                    tipo_evento,
                    fecha_desde,
                    fecha_hasta,
                )
                eventos_recientes = IntranetService._get_fichajes_recientes(
                    cursor,
                    empleado_id,
                    tipo_evento,
                    fecha_desde,
                    fecha_hasta,
                    page_size,
                    offset,
                )

        return {
            "usuario": IntranetService._map_usuario(usuario),
            "resumen": resumen,
            "eventos_recientes": eventos_recientes,
            "paginacion": IntranetService._build_pagination_meta(page, page_size, total),
        }

    @staticmethod
    def get_fichaje_export(
        user_id: str,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
    ) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                start_date, end_date, start_iso, end_iso, label = IntranetService._normalize_export_range(
                    fecha_desde,
                    fecha_hasta,
                )
                eventos = IntranetService._get_fichajes_all(
                    cursor,
                    empleado_id=usuario["empleado_id"],
                    tipo_evento=None,
                    fecha_desde=start_iso,
                    fecha_hasta=end_iso,
                    order_desc=False,
                )
                rows = IntranetService._build_fichaje_export_rows(eventos, start_date, end_date)

        return {
            "usuario": IntranetService._map_usuario(usuario),
            "rows": rows,
            "label": label,
        }

    @staticmethod
    def delete_last_fichaje(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                cursor.execute(
                    """
                    SELECT
                        id::text AS id,
                        tipo_evento::text AS tipo_evento,
                        fecha_hora,
                        origen::text AS origen,
                        observaciones
                    FROM fichajes
                    WHERE empleado_id = %s
                    ORDER BY fecha_hora DESC
                    LIMIT 1
                    """,
                    (empleado_id,),
                )
                evento = cursor.fetchone()
                if not evento:
                    raise HTTPException(status_code=404, detail="No hay fichajes para deshacer.")

                evento_fecha = evento["fecha_hora"].astimezone(IntranetService.MADRID_TZ).date()
                hoy = datetime.now(IntranetService.MADRID_TZ).date()
                if evento_fecha != hoy:
                    raise HTTPException(
                        status_code=400,
                        detail="Solo se puede deshacer el ultimo fichaje del dia actual.",
                    )

                cursor.execute("DELETE FROM fichajes WHERE id::text = %s", (evento["id"],))
                resumen = IntranetService._get_fichaje_resumen(cursor, empleado_id)

            connection.commit()

        return {
            "evento": dict(evento),
            "resumen": resumen,
        }

    @staticmethod
    def get_clientes_tab(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = IntranetService._get_clientes_resumen(cursor, empleado_id)
                clientes = IntranetService._get_clientes_detalle(cursor, empleado_id)

        return {
            "usuario": IntranetService._map_usuario(usuario),
            "resumen": resumen,
            "clientes": clientes,
        }

    @staticmethod
    def get_trabajos_tab(user_id: str) -> dict:
        return IntranetService.get_trabajos_tab_filtered(user_id)

    @staticmethod
    def get_trabajos_tab_filtered(
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        estado: str | None = None,
        prioridad: str | None = None,
        cliente_id: str | None = None,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
    ) -> dict:
        page, page_size, offset = IntranetService._normalize_pagination(page, page_size)
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = IntranetService._get_trabajos_resumen(cursor, empleado_id)
                total = IntranetService._count_trabajos(
                    cursor,
                    empleado_id,
                    estado,
                    prioridad,
                    cliente_id,
                    fecha_desde,
                    fecha_hasta,
                )
                trabajos = IntranetService._get_trabajos_detalle(
                    cursor,
                    empleado_id,
                    estado,
                    prioridad,
                    cliente_id,
                    fecha_desde,
                    fecha_hasta,
                    page_size,
                    offset,
                )

        return {
            "usuario": IntranetService._map_usuario(usuario),
            "resumen": resumen,
            "trabajos": trabajos,
            "paginacion": IntranetService._build_pagination_meta(page, page_size, total),
        }

    @staticmethod
    def get_pagos_tab(user_id: str) -> dict:
        return IntranetService.get_pagos_tab_filtered(user_id)

    @staticmethod
    def get_pagos_tab_filtered(
        user_id: str,
        page_facturas: int = 1,
        page_size_facturas: int = 20,
        page_pagos: int = 1,
        page_size_pagos: int = 20,
        estado_factura: str | None = None,
        cliente_id: str | None = None,
        vencidas_solo: bool = False,
        fecha_pago_desde: str | None = None,
        fecha_pago_hasta: str | None = None,
    ) -> dict:
        page_facturas, page_size_facturas, offset_facturas = IntranetService._normalize_pagination(
            page_facturas,
            page_size_facturas,
        )
        page_pagos, page_size_pagos, offset_pagos = IntranetService._normalize_pagination(page_pagos, page_size_pagos)

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = IntranetService._get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = IntranetService._get_pagos_resumen(cursor, empleado_id)
                total_facturas = IntranetService._count_facturas(
                    cursor,
                    empleado_id,
                    estado_factura,
                    cliente_id,
                    vencidas_solo,
                )
                total_pagos = IntranetService._count_pagos(
                    cursor,
                    empleado_id,
                    cliente_id,
                    fecha_pago_desde,
                    fecha_pago_hasta,
                )
                facturas = IntranetService._get_facturas_detalle(
                    cursor,
                    empleado_id,
                    estado_factura,
                    cliente_id,
                    vencidas_solo,
                    page_size_facturas,
                    offset_facturas,
                )
                pagos_recientes = IntranetService._get_pagos_recientes(
                    cursor,
                    empleado_id,
                    cliente_id,
                    fecha_pago_desde,
                    fecha_pago_hasta,
                    page_size_pagos,
                    offset_pagos,
                )

        return {
            "usuario": IntranetService._map_usuario(usuario),
            "resumen": resumen,
            "facturas": facturas,
            "pagos_recientes": pagos_recientes,
            "paginacion_facturas": IntranetService._build_pagination_meta(page_facturas, page_size_facturas, total_facturas),
            "paginacion_pagos": IntranetService._build_pagination_meta(page_pagos, page_size_pagos, total_pagos),
        }

    @staticmethod
    def _get_usuario(cursor: RealDictCursor, user_id: str) -> dict | None:
        cursor.execute(
            """
            SELECT
                u.id::text AS usuario_id,
                e.id::text AS empleado_id,
                COALESCE(to_jsonb(u)->>'nombre_usuario', to_jsonb(u)->>'usuario') AS nombre_usuario,
                u.rol::text AS rol,
                e.nombre,
                e.apellidos
            FROM usuarios u
            JOIN empleados e ON e.usuario_id = u.id
            WHERE u.id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        return cursor.fetchone()

    @staticmethod
    def _get_fichaje_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS eventos_hoy,
                COUNT(*) FILTER (
                    WHERE tipo_evento = 'entrada'
                    AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS entradas_hoy,
                COUNT(*) FILTER (
                    WHERE tipo_evento = 'salida'
                    AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS salidas_hoy,
                (ARRAY_AGG(tipo_evento::text ORDER BY fecha_hora DESC))[1] AS ultimo_evento_tipo,
                MAX(fecha_hora) AS ultimo_evento_fecha_hora
            FROM fichajes
            WHERE empleado_id = %s
            """,
            (empleado_id,),
        )
        row = cursor.fetchone() or {}
        ultimo_tipo = row.get("ultimo_evento_tipo")
        entradas_hoy = int(row.get("entradas_hoy") or 0)
        salidas_hoy = int(row.get("salidas_hoy") or 0)
        return {
            "eventos_hoy": int(row.get("eventos_hoy") or 0),
            "ultimo_evento_tipo": ultimo_tipo,
            "ultimo_evento_fecha_hora": row.get("ultimo_evento_fecha_hora"),
            "turno_activo": entradas_hoy > salidas_hoy,
        }

    @staticmethod
    def _get_fichaje_estado_hoy(cursor: RealDictCursor, empleado_id: str) -> dict:
        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE tipo_evento = 'entrada'
                    AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS entradas_hoy,
                COUNT(*) FILTER (
                    WHERE tipo_evento = 'salida'
                    AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
                ) AS salidas_hoy
            FROM fichajes
            WHERE empleado_id = %s
            """,
            (empleado_id,),
        )
        row = cursor.fetchone() or {}
        return {
            "entradas": int(row.get("entradas_hoy") or 0),
            "salidas": int(row.get("salidas_hoy") or 0),
        }

    @staticmethod
    def _get_ultimo_tipo_evento(cursor: RealDictCursor, empleado_id: str) -> str | None:
        cursor.execute(
            """
            SELECT tipo_evento::text AS tipo_evento
            FROM fichajes
            WHERE empleado_id = %s
            ORDER BY fecha_hora DESC
            LIMIT 1
            """,
            (empleado_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return row.get("tipo_evento")

    @staticmethod
    def _get_ultimo_evento_hoy(cursor: RealDictCursor, empleado_id: str) -> str | None:
        cursor.execute(
            """
            SELECT tipo_evento::text AS tipo_evento
            FROM fichajes
            WHERE empleado_id = %s
            AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE
            ORDER BY fecha_hora DESC
            LIMIT 1
            """,
            (empleado_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return row.get("tipo_evento")

    @staticmethod
    def _count_fichajes(
        cursor: RealDictCursor,
        empleado_id: str,
        tipo_evento: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> int:
        where, values = IntranetService._build_fichajes_filters(empleado_id, tipo_evento, fecha_desde, fecha_hasta)
        cursor.execute(f"SELECT COUNT(*) AS total FROM fichajes WHERE {where}", values)
        row = cursor.fetchone() or {}
        return int(row.get("total") or 0)

    @staticmethod
    def _get_fichajes_recientes(
        cursor: RealDictCursor,
        empleado_id: str,
        tipo_evento: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
        limit: int,
        offset: int,
    ) -> list[dict]:
        where, values = IntranetService._build_fichajes_filters(empleado_id, tipo_evento, fecha_desde, fecha_hasta)
        cursor.execute(
            f"""
            SELECT
                id::text AS id,
                tipo_evento::text AS tipo_evento,
                fecha_hora,
                origen::text AS origen,
                observaciones
            FROM fichajes
            WHERE {where}
            ORDER BY fecha_hora DESC
            LIMIT %s OFFSET %s
            """,
            (*values, limit, offset),
        )
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def _get_fichajes_all(
        cursor: RealDictCursor,
        empleado_id: str,
        tipo_evento: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
        order_desc: bool = True,
    ) -> list[dict]:
        where, values = IntranetService._build_fichajes_filters(empleado_id, tipo_evento, fecha_desde, fecha_hasta)
        order = "DESC" if order_desc else "ASC"
        cursor.execute(
            f"""
            SELECT
                id::text AS id,
                tipo_evento::text AS tipo_evento,
                fecha_hora,
                origen::text AS origen,
                observaciones
            FROM fichajes
            WHERE {where}
            ORDER BY fecha_hora {order}
            """,
            values,
        )
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def _build_fichajes_filters(
        empleado_id: str,
        tipo_evento: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> tuple[str, list]:
        clauses = ["empleado_id = %s"]
        values: list = [empleado_id]
        if tipo_evento:
            clauses.append("tipo_evento::text = %s")
            values.append(tipo_evento)
        if fecha_desde:
            clauses.append("DATE(fecha_hora) >= %s")
            values.append(fecha_desde)
        if fecha_hasta:
            clauses.append("DATE(fecha_hora) <= %s")
            values.append(fecha_hasta)
        return " AND ".join(clauses), values

    @staticmethod
    def _normalize_export_range(
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> tuple[date, date, str, str, str]:
        today = datetime.now(IntranetService.MADRID_TZ).date()
        if fecha_desde:
            start_date = date.fromisoformat(fecha_desde)
        else:
            start_date = today.replace(day=1)

        if fecha_hasta:
            end_date = date.fromisoformat(fecha_hasta)
        else:
            end_date = today

        if end_date < start_date:
            start_date, end_date = end_date, start_date

        label = f"{IntranetService.MONTH_ABBR[start_date.month - 1]} {start_date.year}"
        return (
            start_date,
            end_date,
            start_date.isoformat(),
            end_date.isoformat(),
            label,
        )

    @staticmethod
    def _build_fichaje_export_rows(
        eventos: list[dict],
        start_date: date,
        end_date: date,
    ) -> list[dict]:
        eventos_por_dia: dict[str, list[dict]] = {}
        for evento in eventos:
            fecha_hora: datetime = evento["fecha_hora"]
            local_date = fecha_hora.astimezone(IntranetService.MADRID_TZ).date()
            key = local_date.isoformat()
            eventos_por_dia.setdefault(key, []).append(evento)

        for items in eventos_por_dia.values():
            items.sort(key=lambda item: item["fecha_hora"])

        rows: list[dict] = []
        current = end_date
        while current >= start_date:
            key = current.isoformat()
            day_events = eventos_por_dia.get(key, [])
            entry = next((event for event in day_events if event["tipo_evento"] == "entrada"), None)
            exit_event = next((event for event in day_events if event["tipo_evento"] == "salida"), None)

            pause_minutes = IntranetService._calculate_pause_minutes(day_events)

            hours_value = None
            if entry and exit_event:
                diff_ms = (exit_event["fecha_hora"] - entry["fecha_hora"]).total_seconds()
                hours_value = max(0, diff_ms / 3600 - (pause_minutes / 60))

            status_label = "Ausencia"
            exit_label = "--:--"
            if entry and exit_event:
                status_label = "Completa"
                exit_label = IntranetService._format_time(exit_event["fecha_hora"])
            elif entry:
                status_label = "En curso"
                exit_label = "en curso"

            rows.append(
                {
                    "day_label": IntranetService._format_day_label(current),
                    "entry_time": IntranetService._format_time(entry["fecha_hora"]) if entry else "--:--",
                    "exit_time": exit_label,
                    "hours_label": f"{hours_value:.1f}h" if hours_value is not None else "--",
                    "status_label": status_label,
                }
            )

            current -= timedelta(days=1)

        return rows

    @staticmethod
    def _calculate_pause_minutes(eventos: list[dict]) -> int:
        pause_start: datetime | None = None
        total_minutes = 0
        for evento in eventos:
            if evento["tipo_evento"] == "pausa_inicio":
                pause_start = evento["fecha_hora"]
            elif evento["tipo_evento"] == "pausa_fin" and pause_start:
                diff = evento["fecha_hora"] - pause_start
                total_minutes += max(0, int(diff.total_seconds() // 60))
                pause_start = None
        return total_minutes

    @staticmethod
    def _format_day_label(value: date) -> str:
        return f"{value.day:02d} {IntranetService.MONTH_ABBR[value.month - 1]}"

    @staticmethod
    def _format_time(value: datetime) -> str:
        local = value.astimezone(IntranetService.MADRID_TZ)
        return local.strftime("%H:%M")

    @staticmethod
    def _get_clientes_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
        cursor.execute(
            """
            WITH clientes_asignados AS (
                SELECT DISTINCT t.cliente_id
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            )
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE activo = TRUE) AS activos
            FROM clientes
            WHERE id IN (SELECT cliente_id FROM clientes_asignados)
            """
            ,
            (empleado_id,)
        )
        row = cursor.fetchone() or {}
        return {
            "total": int(row.get("total") or 0),
            "activos": int(row.get("activos") or 0),
        }

    @staticmethod
    def _get_clientes_detalle(cursor: RealDictCursor, empleado_id: str) -> list[dict]:
        cursor.execute(
            """
            WITH trabajos_asignados AS (
                SELECT DISTINCT t.id, t.cliente_id, t.estado
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            ),
            pagos_por_factura AS (
                SELECT factura_id, COALESCE(SUM(importe), 0) AS pagado
                FROM pagos
                GROUP BY factura_id
            )
            SELECT
                c.id::text AS cliente_id,
                c.nombre_fiscal,
                c.cif_nif,
                c.activo,
                COUNT(ta.id) FILTER (WHERE ta.estado IN ('pendiente', 'en_curso', 'bloqueado')) AS trabajos_abiertos,
                COALESCE(
                    SUM(
                        GREATEST(
                            f.total - COALESCE(ppf.pagado, 0),
                            0
                        )
                    ) FILTER (WHERE f.estado <> 'anulada'),
                    0
                ) AS pendiente_total
            FROM clientes c
            JOIN trabajos_asignados ta ON ta.cliente_id = c.id
            LEFT JOIN facturas f ON f.cliente_id = c.id
            LEFT JOIN pagos_por_factura ppf ON ppf.factura_id = f.id
            GROUP BY c.id, c.nombre_fiscal, c.cif_nif, c.activo
            ORDER BY c.nombre_fiscal ASC
            """,
            (empleado_id,),
        )
        rows = cursor.fetchall()
        return [
            {
                "cliente_id": row["cliente_id"],
                "nombre_fiscal": row["nombre_fiscal"],
                "cif_nif": row["cif_nif"],
                "activo": row["activo"],
                "trabajos_abiertos": int(row["trabajos_abiertos"] or 0),
                "pendiente_total": float(row["pendiente_total"] or 0),
            }
            for row in rows
        ]

    @staticmethod
    def _get_trabajos_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
        cursor.execute(
            """
            WITH trabajos_asignados AS (
                SELECT DISTINCT t.id, t.estado
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            )
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
                COUNT(*) FILTER (WHERE estado = 'en_curso') AS en_curso,
                COUNT(*) FILTER (WHERE estado = 'bloqueado') AS bloqueados,
                COUNT(*) FILTER (WHERE estado = 'finalizado') AS finalizados,
                COUNT(*) FILTER (WHERE estado = 'cancelado') AS cancelados
            FROM trabajos_asignados
            """
            ,
            (empleado_id,)
        )
        row = cursor.fetchone() or {}
        return {
            "total": int(row.get("total") or 0),
            "pendientes": int(row.get("pendientes") or 0),
            "en_curso": int(row.get("en_curso") or 0),
            "bloqueados": int(row.get("bloqueados") or 0),
            "finalizados": int(row.get("finalizados") or 0),
            "cancelados": int(row.get("cancelados") or 0),
        }

    @staticmethod
    def _count_trabajos(
        cursor: RealDictCursor,
        empleado_id: str,
        estado: str | None,
        prioridad: str | None,
        cliente_id: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> int:
        where, values = IntranetService._build_trabajos_filters(
            empleado_id,
            estado,
            prioridad,
            cliente_id,
            fecha_desde,
            fecha_hasta,
        )
        cursor.execute(
            f"""
            SELECT COUNT(DISTINCT t.id) AS total
            FROM trabajo_empleado te
            JOIN trabajos t ON t.id = te.trabajo_id
            WHERE {where}
            """,
            values,
        )
        row = cursor.fetchone() or {}
        return int(row.get("total") or 0)

    @staticmethod
    def _get_trabajos_detalle(
        cursor: RealDictCursor,
        empleado_id: str,
        estado: str | None,
        prioridad: str | None,
        cliente_id: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
        limit: int,
        offset: int,
    ) -> list[dict]:
        where, values = IntranetService._build_trabajos_filters(
            empleado_id,
            estado,
            prioridad,
            cliente_id,
            fecha_desde,
            fecha_hasta,
        )
        cursor.execute(
            f"""
            SELECT DISTINCT
                t.id::text AS trabajo_id,
                t.titulo,
                t.estado::text AS estado,
                t.prioridad::text AS prioridad,
                c.id::text AS cliente_id,
                c.nombre_fiscal AS cliente_nombre,
                t.fecha_inicio,
                t.fecha_objetivo,
                t.fecha_cierre
            FROM trabajo_empleado te
            JOIN trabajos t ON t.id = te.trabajo_id
            JOIN clientes c ON c.id = t.cliente_id
            WHERE {where}
            ORDER BY t.updated_at DESC
            LIMIT %s OFFSET %s
            """,
            (*values, limit, offset),
        )
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def _build_trabajos_filters(
        empleado_id: str,
        estado: str | None,
        prioridad: str | None,
        cliente_id: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> tuple[str, list]:
        clauses = ["te.empleado_id = %s", "te.desasignado_en IS NULL"]
        values: list = [empleado_id]
        if estado:
            clauses.append("t.estado::text = %s")
            values.append(estado)
        if prioridad:
            clauses.append("t.prioridad::text = %s")
            values.append(prioridad)
        if cliente_id:
            clauses.append("t.cliente_id::text = %s")
            values.append(cliente_id)
        if fecha_desde:
            clauses.append("(t.fecha_inicio IS NULL OR t.fecha_inicio >= %s)")
            values.append(fecha_desde)
        if fecha_hasta:
            clauses.append("(t.fecha_inicio IS NULL OR t.fecha_inicio <= %s)")
            values.append(fecha_hasta)
        return " AND ".join(clauses), values

    @staticmethod
    def _get_pagos_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
        cursor.execute(
            """
            WITH clientes_asignados AS (
                SELECT DISTINCT t.cliente_id
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            ),
            facturas_scope AS (
                SELECT f.*
                FROM facturas f
                WHERE f.cliente_id IN (SELECT cliente_id FROM clientes_asignados)
            ),
            pagos_scope AS (
                SELECT p.*
                FROM pagos p
                WHERE p.factura_id IN (SELECT id FROM facturas_scope)
            ),
            pagos_por_factura AS (
                SELECT factura_id, COALESCE(SUM(importe), 0) AS pagado
                FROM pagos_scope
                GROUP BY factura_id
            )
            SELECT
                COALESCE(
                    SUM(ps.importe) FILTER (
                        WHERE date_trunc('month', ps.fecha_pago::timestamp) = date_trunc('month', CURRENT_DATE::timestamp)
                    ),
                    0
                ) AS cobrado_mes,
                COALESCE(
                    SUM(
                        GREATEST(
                            fs.total - COALESCE(ppf.pagado, 0),
                            0
                        )
                    ) FILTER (WHERE fs.estado <> 'anulada'),
                    0
                ) AS pendiente_total,
                COUNT(*) FILTER (
                    WHERE fs.estado IN ('emitida', 'pagada_parcial')
                    AND fs.fecha_vencimiento IS NOT NULL
                    AND fs.fecha_vencimiento < CURRENT_DATE
                ) AS facturas_vencidas
            FROM facturas_scope fs
            LEFT JOIN pagos_scope ps ON ps.factura_id = fs.id
            LEFT JOIN pagos_por_factura ppf ON ppf.factura_id = fs.id
            """
            ,
            (empleado_id,)
        )
        row = cursor.fetchone() or {}
        return {
            "cobrado_mes": float(row.get("cobrado_mes") or 0),
            "pendiente_total": float(row.get("pendiente_total") or 0),
            "facturas_vencidas": int(row.get("facturas_vencidas") or 0),
        }

    @staticmethod
    def _count_facturas(
        cursor: RealDictCursor,
        empleado_id: str,
        estado_factura: str | None,
        cliente_id: str | None,
        vencidas_solo: bool,
    ) -> int:
        where, values = IntranetService._build_facturas_filters(empleado_id, estado_factura, cliente_id, vencidas_solo)
        cursor.execute(
            f"""
            WITH clientes_asignados AS (
                SELECT DISTINCT t.cliente_id
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            )
            SELECT COUNT(*) AS total
            FROM facturas f
            WHERE f.cliente_id IN (SELECT cliente_id FROM clientes_asignados)
            AND {where}
            """,
            values,
        )
        row = cursor.fetchone() or {}
        return int(row.get("total") or 0)

    @staticmethod
    def _get_facturas_detalle(
        cursor: RealDictCursor,
        empleado_id: str,
        estado_factura: str | None,
        cliente_id: str | None,
        vencidas_solo: bool,
        limit: int,
        offset: int,
    ) -> list[dict]:
        where, values = IntranetService._build_facturas_filters(empleado_id, estado_factura, cliente_id, vencidas_solo)
        cursor.execute(
            f"""
            WITH clientes_asignados AS (
                SELECT DISTINCT t.cliente_id
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            ),
            pagos_por_factura AS (
                SELECT factura_id, COALESCE(SUM(importe), 0) AS pagado
                FROM pagos
                GROUP BY factura_id
            )
            SELECT
                f.id::text AS factura_id,
                f.numero,
                c.id::text AS cliente_id,
                c.nombre_fiscal AS cliente_nombre,
                f.estado::text AS estado,
                f.fecha_emision,
                f.fecha_vencimiento,
                f.total,
                COALESCE(ppf.pagado, 0) AS pagado,
                GREATEST(f.total - COALESCE(ppf.pagado, 0), 0) AS pendiente
            FROM facturas f
            JOIN clientes c ON c.id = f.cliente_id
            LEFT JOIN pagos_por_factura ppf ON ppf.factura_id = f.id
            WHERE f.cliente_id IN (SELECT cliente_id FROM clientes_asignados)
            AND {where}
            ORDER BY f.fecha_emision DESC
            LIMIT %s OFFSET %s
            """,
            (*values, limit, offset),
        )
        rows = cursor.fetchall()
        return [
            {
                **dict(row),
                "total": float(row["total"] or 0),
                "pagado": float(row["pagado"] or 0),
                "pendiente": float(row["pendiente"] or 0),
            }
            for row in rows
        ]

    @staticmethod
    def _count_pagos(
        cursor: RealDictCursor,
        empleado_id: str,
        cliente_id: str | None,
        fecha_pago_desde: str | None,
        fecha_pago_hasta: str | None,
    ) -> int:
        where, values = IntranetService._build_pagos_filters(empleado_id, cliente_id, fecha_pago_desde, fecha_pago_hasta)
        cursor.execute(
            f"""
            WITH clientes_asignados AS (
                SELECT DISTINCT t.cliente_id
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            )
            SELECT COUNT(*) AS total
            FROM pagos p
            JOIN facturas f ON f.id = p.factura_id
            WHERE f.cliente_id IN (SELECT cliente_id FROM clientes_asignados)
            AND {where}
            """,
            values,
        )
        row = cursor.fetchone() or {}
        return int(row.get("total") or 0)

    @staticmethod
    def _get_pagos_recientes(
        cursor: RealDictCursor,
        empleado_id: str,
        cliente_id: str | None,
        fecha_pago_desde: str | None,
        fecha_pago_hasta: str | None,
        limit: int,
        offset: int,
    ) -> list[dict]:
        where, values = IntranetService._build_pagos_filters(empleado_id, cliente_id, fecha_pago_desde, fecha_pago_hasta)
        cursor.execute(
            f"""
            WITH clientes_asignados AS (
                SELECT DISTINCT t.cliente_id
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE te.empleado_id = %s
                AND te.desasignado_en IS NULL
            )
            SELECT
                p.id::text AS pago_id,
                f.id::text AS factura_id,
                f.numero AS factura_numero,
                c.nombre_fiscal AS cliente_nombre,
                p.fecha_pago,
                p.importe,
                p.metodo_pago::text AS metodo_pago
            FROM pagos p
            JOIN facturas f ON f.id = p.factura_id
            JOIN clientes c ON c.id = f.cliente_id
            WHERE f.cliente_id IN (SELECT cliente_id FROM clientes_asignados)
            AND {where}
            ORDER BY p.fecha_pago DESC, p.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (*values, limit, offset),
        )
        rows = cursor.fetchall()
        return [
            {
                **dict(row),
                "importe": float(row["importe"] or 0),
            }
            for row in rows
        ]

    @staticmethod
    def _build_facturas_filters(
        empleado_id: str,
        estado_factura: str | None,
        cliente_id: str | None,
        vencidas_solo: bool,
    ) -> tuple[str, list]:
        clauses = ["TRUE"]
        values: list = [empleado_id]
        if estado_factura:
            clauses.append("f.estado::text = %s")
            values.append(estado_factura)
        if cliente_id:
            clauses.append("f.cliente_id::text = %s")
            values.append(cliente_id)
        if vencidas_solo:
            clauses.append("f.estado IN ('emitida', 'pagada_parcial')")
            clauses.append("f.fecha_vencimiento IS NOT NULL")
            clauses.append("f.fecha_vencimiento < CURRENT_DATE")
        return " AND ".join(clauses), values

    @staticmethod
    def _build_pagos_filters(
        empleado_id: str,
        cliente_id: str | None,
        fecha_pago_desde: str | None,
        fecha_pago_hasta: str | None,
    ) -> tuple[str, list]:
        clauses = ["TRUE"]
        values: list = [empleado_id]
        if cliente_id:
            clauses.append("f.cliente_id::text = %s")
            values.append(cliente_id)
        if fecha_pago_desde:
            clauses.append("p.fecha_pago >= %s")
            values.append(fecha_pago_desde)
        if fecha_pago_hasta:
            clauses.append("p.fecha_pago <= %s")
            values.append(fecha_pago_hasta)
        return " AND ".join(clauses), values

    @staticmethod
    def _normalize_pagination(page: int, page_size: int) -> tuple[int, int, int]:
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size
        return page, page_size, offset

    @staticmethod
    def _build_pagination_meta(page: int, page_size: int, total: int) -> dict:
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        return {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        }

    @staticmethod
    def _map_usuario(usuario: dict) -> dict:
        return {
            "usuario_id": usuario["usuario_id"],
            "empleado_id": usuario["empleado_id"],
            "nombre_usuario": usuario["nombre_usuario"],
            "nombre_completo": f"{usuario['nombre']} {usuario['apellidos']}".strip(),
            "rol": usuario["rol"],
        }
