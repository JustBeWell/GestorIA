from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import get_usuario, map_usuario


class ClientesService:

    @staticmethod
    def get_clientes_tab(user_id: str, page: int = 1, page_size: int = 20) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = ClientesService.get_clientes_resumen(cursor, empleado_id)
                clientes, total = ClientesService._get_clientes_detalle(cursor, empleado_id, page, page_size)

        return {
            "usuario": map_usuario(usuario),
            "resumen": resumen,
            "clientes": clientes,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    # ── Semi-public helper (used by HomeService) ───────────────────────────────

    @staticmethod
    def get_clientes_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
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
            """,
            (empleado_id,),
        )
        row = cursor.fetchone() or {}
        return {
            "total": int(row.get("total") or 0),
            "activos": int(row.get("activos") or 0),
        }

    # ── Private helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _get_clientes_detalle(cursor: RealDictCursor, empleado_id: str, page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
        offset = (page - 1) * page_size
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
            ),
            base AS (
                SELECT
                    c.id::text AS cliente_id,
                    c.nombre_fiscal,
                    c.cif_nif,
                    c.activo,
                    COUNT(ta.id) FILTER (WHERE ta.estado IN ('pendiente', 'en_curso', 'bloqueado')) AS trabajos_abiertos,
                    COALESCE(
                        SUM(GREATEST(f.total - COALESCE(ppf.pagado, 0), 0))
                        FILTER (WHERE f.estado <> 'anulada'),
                        0
                    ) AS pendiente_total
                FROM clientes c
                JOIN trabajos_asignados ta ON ta.cliente_id = c.id
                LEFT JOIN facturas f ON f.cliente_id = c.id
                LEFT JOIN pagos_por_factura ppf ON ppf.factura_id = f.id
                GROUP BY c.id, c.nombre_fiscal, c.cif_nif, c.activo
            )
            SELECT *, COUNT(*) OVER () AS total_count
            FROM base
            ORDER BY nombre_fiscal ASC
            LIMIT %s OFFSET %s
            """,
            (empleado_id, page_size, offset),
        )
        rows = cursor.fetchall()
        total = int(rows[0]["total_count"]) if rows else 0
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
        ], total
