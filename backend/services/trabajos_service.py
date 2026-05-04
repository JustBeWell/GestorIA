from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import build_pagination_meta, get_usuario, map_usuario, normalize_pagination


class TrabajosService:

    @staticmethod
    def get_trabajos_tab(user_id: str) -> dict:
        return TrabajosService.get_trabajos_tab_filtered(user_id)

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
        page, page_size, offset = normalize_pagination(page, page_size)
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = TrabajosService.get_trabajos_resumen(cursor, empleado_id)
                total = TrabajosService._count_trabajos(
                    cursor, empleado_id, estado, prioridad, cliente_id, fecha_desde, fecha_hasta,
                )
                trabajos = TrabajosService._get_trabajos_detalle(
                    cursor, empleado_id, estado, prioridad, cliente_id, fecha_desde, fecha_hasta, page_size, offset,
                )

        return {
            "usuario": map_usuario(usuario),
            "resumen": resumen,
            "trabajos": trabajos,
            "paginacion": build_pagination_meta(page, page_size, total),
        }

    # ── Semi-public helper (used by HomeService) ───────────────────────────────

    @staticmethod
    def get_trabajos_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
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
            """,
            (empleado_id,),
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

    # ── Private helpers ────────────────────────────────────────────────────────

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
        where, values = TrabajosService._build_trabajos_filters(
            empleado_id, estado, prioridad, cliente_id, fecha_desde, fecha_hasta,
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
        where, values = TrabajosService._build_trabajos_filters(
            empleado_id, estado, prioridad, cliente_id, fecha_desde, fecha_hasta,
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
