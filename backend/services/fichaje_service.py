from datetime import date, datetime, timedelta

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import (
    MADRID_TZ,
    MONTH_ABBR,
    build_pagination_meta,
    get_usuario,
    map_usuario,
    normalize_pagination,
)


class FichajeService:

    @staticmethod
    def get_fichaje_tab(user_id: str) -> dict:
        return FichajeService.get_fichaje_tab_filtered(user_id)

    @staticmethod
    def get_fichaje_tab_filtered(
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        tipo_evento: str | None = None,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
    ) -> dict:
        page, page_size, offset = normalize_pagination(page, page_size)
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = FichajeService.get_fichaje_resumen(cursor, empleado_id)
                total = FichajeService._count_fichajes(cursor, empleado_id, tipo_evento, fecha_desde, fecha_hasta)
                eventos_recientes = FichajeService._get_fichajes_recientes(
                    cursor, empleado_id, tipo_evento, fecha_desde, fecha_hasta, page_size, offset,
                )

        return {
            "usuario": map_usuario(usuario),
            "resumen": resumen,
            "eventos_recientes": eventos_recientes,
            "paginacion": build_pagination_meta(page, page_size, total),
        }

    @staticmethod
    def create_fichaje_event(
        user_id: str,
        tipo_evento: str | None,
        observaciones: str | None,
        origen: str = "web",
    ) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                estado_hoy = FichajeService._get_fichaje_estado_hoy(cursor, empleado_id)
                ultimo_evento_hoy = FichajeService._get_ultimo_evento_hoy(cursor, empleado_id)

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
                        raise HTTPException(status_code=400, detail="Ya existe una entrada registrada para hoy.")
                    if tipo_evento == "salida" and estado_hoy["salidas"] >= 1:
                        raise HTTPException(status_code=400, detail="Ya existe una salida registrada para hoy.")
                    if tipo_evento == "salida" and estado_hoy["entradas"] == 0:
                        raise HTTPException(
                            status_code=400, detail="No se puede registrar una salida sin una entrada previa hoy.",
                        )
                    if tipo_evento == "salida" and ultimo_evento_hoy == "pausa_inicio":
                        raise HTTPException(
                            status_code=400, detail="Finaliza la pausa antes de registrar la salida.",
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
                            raise HTTPException(status_code=400, detail="Ya hay una pausa en curso.")
                        if tipo_evento == "pausa_fin" and ultimo_evento_hoy != "pausa_inicio":
                            raise HTTPException(
                                status_code=400, detail="No hay una pausa en curso para finalizar.",
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
                resumen = FichajeService.get_fichaje_resumen(cursor, empleado_id)

            connection.commit()

        return {
            "evento": dict(evento) if evento else {},
            "resumen": resumen,
        }

    @staticmethod
    def get_fichaje_export(
        user_id: str,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
    ) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                start_date, end_date, start_iso, end_iso, label = FichajeService._normalize_export_range(
                    fecha_desde, fecha_hasta,
                )
                eventos = FichajeService.get_fichajes_all(
                    cursor,
                    empleado_id=usuario["empleado_id"],
                    tipo_evento=None,
                    fecha_desde=start_iso,
                    fecha_hasta=end_iso,
                    order_desc=False,
                )
                rows = FichajeService._build_fichaje_export_rows(eventos, start_date, end_date)

        return {
            "usuario": map_usuario(usuario),
            "rows": rows,
            "label": label,
        }

    @staticmethod
    def delete_last_fichaje(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
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

                evento_fecha = evento["fecha_hora"].astimezone(MADRID_TZ).date()
                hoy = datetime.now(MADRID_TZ).date()
                if evento_fecha != hoy:
                    raise HTTPException(
                        status_code=400,
                        detail="Solo se puede deshacer el ultimo fichaje del dia actual.",
                    )

                cursor.execute("DELETE FROM fichajes WHERE id::text = %s", (evento["id"],))
                resumen = FichajeService.get_fichaje_resumen(cursor, empleado_id)

            connection.commit()

        return {
            "evento": dict(evento),
            "resumen": resumen,
        }

    # ── Semi-public helpers (used by HomeService, AdminService, SeriesService) ──

    @staticmethod
    def get_fichaje_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
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
    def get_fichajes_all(
        cursor: RealDictCursor,
        empleado_id: str,
        tipo_evento: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
        order_desc: bool = True,
    ) -> list[dict]:
        where, values = FichajeService._build_fichajes_filters(empleado_id, tipo_evento, fecha_desde, fecha_hasta)
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
    def build_fichaje_hours_by_month(
        eventos: list[dict],
        start_date: date,
        end_date: date,
    ) -> dict[str, float]:
        eventos_por_dia: dict[str, list[dict]] = {}
        for evento in eventos:
            fecha_hora: datetime = evento["fecha_hora"]
            local_date = fecha_hora.astimezone(MADRID_TZ).date()
            if local_date < start_date or local_date > end_date:
                continue
            key = local_date.isoformat()
            eventos_por_dia.setdefault(key, []).append(evento)

        for items in eventos_por_dia.values():
            items.sort(key=lambda item: item["fecha_hora"])

        hours_by_month: dict[str, float] = {}
        for key, day_events in eventos_por_dia.items():
            entry = next((e for e in day_events if e["tipo_evento"] == "entrada"), None)
            exit_event = next((e for e in day_events if e["tipo_evento"] == "salida"), None)
            if not entry or not exit_event:
                continue

            pause_minutes = FichajeService._calculate_pause_minutes(day_events)
            diff_hours = max(
                0,
                (exit_event["fecha_hora"] - entry["fecha_hora"]).total_seconds() / 3600 - (pause_minutes / 60),
            )
            day_date = date.fromisoformat(key)
            month_key = f"{day_date.year:04d}-{day_date.month:02d}"
            hours_by_month[month_key] = hours_by_month.get(month_key, 0) + diff_hours

        return {key: round(value, 1) for key, value in hours_by_month.items()}

    # ── Private helpers ────────────────────────────────────────────────────────

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
        return row.get("tipo_evento") if row else None

    @staticmethod
    def _count_fichajes(
        cursor: RealDictCursor,
        empleado_id: str,
        tipo_evento: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> int:
        where, values = FichajeService._build_fichajes_filters(empleado_id, tipo_evento, fecha_desde, fecha_hasta)
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
        where, values = FichajeService._build_fichajes_filters(empleado_id, tipo_evento, fecha_desde, fecha_hasta)
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
        today = datetime.now(MADRID_TZ).date()
        start_date = date.fromisoformat(fecha_desde) if fecha_desde else today.replace(day=1)
        end_date = date.fromisoformat(fecha_hasta) if fecha_hasta else today

        if end_date < start_date:
            start_date, end_date = end_date, start_date

        label = f"{MONTH_ABBR[start_date.month - 1]} {start_date.year}"
        return start_date, end_date, start_date.isoformat(), end_date.isoformat(), label

    @staticmethod
    def _build_fichaje_export_rows(
        eventos: list[dict],
        start_date: date,
        end_date: date,
    ) -> list[dict]:
        eventos_por_dia: dict[str, list[dict]] = {}
        for evento in eventos:
            fecha_hora: datetime = evento["fecha_hora"]
            local_date = fecha_hora.astimezone(MADRID_TZ).date()
            key = local_date.isoformat()
            eventos_por_dia.setdefault(key, []).append(evento)

        for items in eventos_por_dia.values():
            items.sort(key=lambda item: item["fecha_hora"])

        rows: list[dict] = []
        current = end_date
        while current >= start_date:
            key = current.isoformat()
            day_events = eventos_por_dia.get(key, [])
            entry = next((e for e in day_events if e["tipo_evento"] == "entrada"), None)
            exit_event = next((e for e in day_events if e["tipo_evento"] == "salida"), None)
            pause_minutes = FichajeService._calculate_pause_minutes(day_events)

            hours_value = None
            if entry and exit_event:
                diff_ms = (exit_event["fecha_hora"] - entry["fecha_hora"]).total_seconds()
                hours_value = max(0, diff_ms / 3600 - (pause_minutes / 60))

            status_label = "Ausencia"
            exit_label = "--:--"
            if entry and exit_event:
                status_label = "Completa"
                exit_label = FichajeService._format_time(exit_event["fecha_hora"])
            elif entry:
                status_label = "En curso"
                exit_label = "en curso"

            rows.append({
                "day_label": FichajeService._format_day_label(current),
                "entry_time": FichajeService._format_time(entry["fecha_hora"]) if entry else "--:--",
                "exit_time": exit_label,
                "hours_label": f"{hours_value:.1f}h" if hours_value is not None else "--",
                "status_label": status_label,
            })
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
        return f"{value.day:02d} {MONTH_ABBR[value.month - 1]}"

    @staticmethod
    def _format_time(value: datetime) -> str:
        return value.astimezone(MADRID_TZ).strftime("%H:%M")

    # ── End-of-day auto-close ──────────────────────────────────────────────────

    @staticmethod
    def cerrar_fichajes_abiertos() -> dict:
        closed: list[dict] = []
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT DISTINCT ON (f.empleado_id,
                                        DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid'))
                        f.empleado_id::text AS empleado_id,
                        MIN(f.fecha_hora) OVER (
                            PARTITION BY f.empleado_id,
                                         DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid')
                        ) AS entrada_hora
                    FROM fichajes f
                    WHERE f.tipo_evento::text = 'entrada'
                      AND NOT EXISTS (
                          SELECT 1 FROM fichajes f2
                          WHERE f2.empleado_id = f.empleado_id
                            AND f2.tipo_evento::text = 'salida'
                            AND DATE(f2.fecha_hora AT TIME ZONE 'Europe/Madrid')
                                = DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid')
                      )
                    ORDER BY f.empleado_id,
                             DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid'),
                             f.fecha_hora ASC
                    """,
                )
                open_shifts = cursor.fetchall()

                for row in open_shifts:
                    empleado_id: str = row["empleado_id"]
                    entrada_hora: datetime = row["entrada_hora"]
                    salida_hora: datetime = entrada_hora + timedelta(hours=8)

                    cursor.execute(
                        """
                        SELECT tipo_evento::text AS tipo_evento
                        FROM fichajes
                        WHERE empleado_id = %s
                          AND DATE(fecha_hora AT TIME ZONE 'Europe/Madrid')
                              = DATE(%s AT TIME ZONE 'Europe/Madrid')
                        ORDER BY fecha_hora DESC
                        LIMIT 1
                        """,
                        (empleado_id, entrada_hora),
                    )
                    last = cursor.fetchone()
                    if last and last["tipo_evento"] == "pausa_inicio":
                        cursor.execute(
                            """
                            INSERT INTO fichajes (empleado_id, tipo_evento, fecha_hora, origen, observaciones)
                            VALUES (%s, 'pausa_fin'::tipo_evento_fichaje, %s,
                                    'correccion'::origen_fichaje,
                                    'Cierre automático de pausa al final del día')
                            """,
                            (empleado_id, salida_hora),
                        )

                    cursor.execute(
                        """
                        INSERT INTO fichajes (empleado_id, tipo_evento, fecha_hora, origen, observaciones)
                        VALUES (%s, 'salida'::tipo_evento_fichaje, %s,
                                'correccion'::origen_fichaje,
                                'Salida registrada automáticamente (turno abierto al cierre del día)')
                        RETURNING id::text AS id, fecha_hora
                        """,
                        (empleado_id, salida_hora),
                    )
                    inserted = cursor.fetchone()
                    closed.append({
                        "empleado_id": empleado_id,
                        "entrada_hora": entrada_hora.isoformat(),
                        "salida_hora": salida_hora.isoformat(),
                        "fichaje_id": inserted["id"] if inserted else None,
                    })

            connection.commit()

        return {"cerrados": len(closed), "detalle": closed}
