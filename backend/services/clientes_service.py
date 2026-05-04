from psycopg2.extras import RealDictCursor

from database import db_connection
from models import ClienteCreate, ClienteUpdate
from services._shared import get_usuario, map_usuario


class ClientesService:

    @staticmethod
    def get_clientes_tab(user_id: str, page: int = 1, page_size: int = 50, is_admin: bool = False) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                if is_admin:
                    resumen = ClientesService._get_clientes_resumen_global(cursor)
                    clientes, total = ClientesService._get_clientes_detalle_admin(cursor, page, page_size)
                else:
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

    # ── CRUD ──────────────────────────────────────────────────────────────────

    @staticmethod
    def create_cliente(payload: ClienteCreate) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    INSERT INTO clientes
                        (nombre_fiscal, cif_nif, email, telefono, direccion, codigo_postal, ciudad, provincia)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING
                        id::text AS cliente_id, nombre_fiscal, cif_nif, email, telefono,
                        direccion, codigo_postal, ciudad, provincia, activo, created_at
                    """,
                    (
                        payload.nombre_fiscal,
                        payload.cif_nif.upper(),
                        payload.email,
                        payload.telefono,
                        payload.direccion,
                        payload.codigo_postal,
                        payload.ciudad,
                        payload.provincia,
                    ),
                )
                row = cursor.fetchone()
                connection.commit()
                return ClientesService._map_detail(cursor, row)

    @staticmethod
    def update_cliente(cliente_id: str, payload: ClienteUpdate) -> dict | None:
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or True}
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return ClientesService.get_cliente_detail(cliente_id)

        # Normalise CIF/NIF to uppercase if present
        if "cif_nif" in updates and updates["cif_nif"]:
            updates["cif_nif"] = updates["cif_nif"].upper()

        set_clauses = ", ".join(f"{col} = %s" for col in updates)
        values = list(updates.values()) + [cliente_id]

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    f"""
                    UPDATE clientes
                    SET {set_clauses}, updated_at = NOW()
                    WHERE id = %s AND activo = TRUE
                    RETURNING
                        id::text AS cliente_id, nombre_fiscal, cif_nif, email, telefono,
                        direccion, codigo_postal, ciudad, provincia, activo, created_at
                    """,
                    values,
                )
                row = cursor.fetchone()
                if not row:
                    return None
                connection.commit()
                return ClientesService._map_detail(cursor, row)

    @staticmethod
    def delete_cliente(cliente_id: str) -> bool:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE clientes SET activo = FALSE, updated_at = NOW() WHERE id = %s AND activo = TRUE",
                    (cliente_id,),
                )
                affected = cursor.rowcount
                connection.commit()
                return affected > 0

    @staticmethod
    def get_cliente_detail(cliente_id: str) -> dict | None:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        id::text AS cliente_id, nombre_fiscal, cif_nif, email, telefono,
                        direccion, codigo_postal, ciudad, provincia, activo, created_at
                    FROM clientes
                    WHERE id = %s
                    """,
                    (cliente_id,),
                )
                row = cursor.fetchone()
                if not row:
                    return None
                return ClientesService._map_detail(cursor, row)

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
    def _get_clientes_resumen_global(cursor: RealDictCursor) -> dict:
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE activo = TRUE) AS activos
            FROM clientes
            """
        )
        row = cursor.fetchone() or {}
        return {
            "total": int(row.get("total") or 0),
            "activos": int(row.get("activos") or 0),
        }

    @staticmethod
    def _get_clientes_detalle_admin(cursor: RealDictCursor, page: int = 1, page_size: int = 50) -> tuple[list[dict], int]:
        offset = (page - 1) * page_size
        cursor.execute(
            """
            WITH pagos_por_factura AS (
                SELECT factura_id, COALESCE(SUM(importe), 0) AS pagado
                FROM pagos
                GROUP BY factura_id
            ),
            base AS (
                SELECT
                    c.id::text AS cliente_id,
                    c.nombre_fiscal,
                    c.cif_nif,
                    c.email,
                    c.telefono,
                    c.activo,
                    COUNT(DISTINCT t.id) FILTER (WHERE t.estado IN ('pendiente', 'en_curso', 'bloqueado')) AS trabajos_abiertos,
                    COALESCE(
                        SUM(GREATEST(f.total - COALESCE(ppf.pagado, 0), 0))
                        FILTER (WHERE f.estado <> 'anulada'),
                        0
                    ) AS pendiente_total
                FROM clientes c
                LEFT JOIN trabajos t ON t.cliente_id = c.id
                LEFT JOIN facturas f ON f.cliente_id = c.id
                LEFT JOIN pagos_por_factura ppf ON ppf.factura_id = f.id
                GROUP BY c.id, c.nombre_fiscal, c.cif_nif, c.email, c.telefono, c.activo
            )
            SELECT *, COUNT(*) OVER () AS total_count
            FROM base
            ORDER BY nombre_fiscal ASC
            LIMIT %s OFFSET %s
            """,
            (page_size, offset),
        )
        rows = cursor.fetchall()
        total = int(rows[0]["total_count"]) if rows else 0
        return [
            {
                "cliente_id": row["cliente_id"],
                "nombre_fiscal": row["nombre_fiscal"],
                "cif_nif": row["cif_nif"],
                "email": row.get("email"),
                "telefono": row.get("telefono"),
                "activo": row["activo"],
                "trabajos_abiertos": int(row["trabajos_abiertos"] or 0),
                "pendiente_total": float(row["pendiente_total"] or 0),
            }
            for row in rows
        ], total

    @staticmethod
    def _get_clientes_detalle(cursor: RealDictCursor, empleado_id: str, page: int = 1, page_size: int = 50) -> tuple[list[dict], int]:
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
                    c.email,
                    c.telefono,
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
                GROUP BY c.id, c.nombre_fiscal, c.cif_nif, c.email, c.telefono, c.activo
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
                "email": row.get("email"),
                "telefono": row.get("telefono"),
                "activo": row["activo"],
                "trabajos_abiertos": int(row["trabajos_abiertos"] or 0),
                "pendiente_total": float(row["pendiente_total"] or 0),
            }
            for row in rows
        ], total

    @staticmethod
    def _map_detail(cursor: RealDictCursor, row: dict) -> dict:
        """Build a ClienteDetailItem dict enriched with aggregated counts."""
        cliente_id = row["cliente_id"]

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado IN ('pendiente', 'en_curso', 'bloqueado')) AS abiertos
            FROM trabajos
            WHERE cliente_id = %s
            """,
            (cliente_id,),
        )
        t = cursor.fetchone() or {}

        cursor.execute(
            """
            WITH ppf AS (
                SELECT factura_id, COALESCE(SUM(importe), 0) AS pagado
                FROM pagos GROUP BY factura_id
            )
            SELECT
                COUNT(f.id) AS total,
                COALESCE(SUM(GREATEST(f.total - COALESCE(ppf.pagado, 0), 0))
                    FILTER (WHERE f.estado <> 'anulada'), 0) AS pendiente
            FROM facturas f
            LEFT JOIN ppf ON ppf.factura_id = f.id
            WHERE f.cliente_id = %s
            """,
            (cliente_id,),
        )
        f = cursor.fetchone() or {}

        return {
            "cliente_id": cliente_id,
            "nombre_fiscal": row["nombre_fiscal"],
            "cif_nif": row["cif_nif"],
            "email": row.get("email"),
            "telefono": row.get("telefono"),
            "direccion": row.get("direccion"),
            "codigo_postal": row.get("codigo_postal"),
            "ciudad": row.get("ciudad"),
            "provincia": row.get("provincia"),
            "activo": row["activo"],
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            "trabajos_count": int(t.get("total") or 0),
            "trabajos_abiertos": int(t.get("abiertos") or 0),
            "facturas_count": int(f.get("total") or 0),
            "pendiente_total": float(f.get("pendiente") or 0),
        }
