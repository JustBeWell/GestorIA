from psycopg2.extras import RealDictCursor

from database import db_connection
from services._shared import build_pagination_meta, get_usuario, map_usuario, normalize_pagination


class PagosService:

    @staticmethod
    def get_pagos_tab(user_id: str) -> dict:
        return PagosService.get_pagos_tab_filtered(user_id)

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
        page_facturas, page_size_facturas, offset_facturas = normalize_pagination(page_facturas, page_size_facturas)
        page_pagos, page_size_pagos, offset_pagos = normalize_pagination(page_pagos, page_size_pagos)

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                usuario = get_usuario(cursor, user_id)
                if not usuario:
                    return {}

                empleado_id = usuario["empleado_id"]
                resumen = PagosService.get_pagos_resumen(cursor, empleado_id)
                total_facturas = PagosService._count_facturas(
                    cursor, empleado_id, estado_factura, cliente_id, vencidas_solo,
                )
                total_pagos = PagosService._count_pagos(
                    cursor, empleado_id, cliente_id, fecha_pago_desde, fecha_pago_hasta,
                )
                facturas = PagosService._get_facturas_detalle(
                    cursor, empleado_id, estado_factura, cliente_id, vencidas_solo,
                    page_size_facturas, offset_facturas,
                )
                pagos_recientes = PagosService._get_pagos_recientes(
                    cursor, empleado_id, cliente_id, fecha_pago_desde, fecha_pago_hasta,
                    page_size_pagos, offset_pagos,
                )

        return {
            "usuario": map_usuario(usuario),
            "resumen": resumen,
            "facturas": facturas,
            "pagos_recientes": pagos_recientes,
            "paginacion_facturas": build_pagination_meta(page_facturas, page_size_facturas, total_facturas),
            "paginacion_pagos": build_pagination_meta(page_pagos, page_size_pagos, total_pagos),
        }

    # ── Semi-public helper (used by HomeService) ───────────────────────────────

    @staticmethod
    def get_pagos_resumen(cursor: RealDictCursor, empleado_id: str) -> dict:
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
                SELECT f.* FROM facturas f
                WHERE f.cliente_id IN (SELECT cliente_id FROM clientes_asignados)
            ),
            pagos_scope AS (
                SELECT p.* FROM pagos p
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
                    SUM(GREATEST(fs.total - COALESCE(ppf.pagado, 0), 0))
                    FILTER (WHERE fs.estado <> 'anulada'),
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
            """,
            (empleado_id,),
        )
        row = cursor.fetchone() or {}
        return {
            "cobrado_mes": float(row.get("cobrado_mes") or 0),
            "pendiente_total": float(row.get("pendiente_total") or 0),
            "facturas_vencidas": int(row.get("facturas_vencidas") or 0),
        }

    # ── Private helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _count_facturas(
        cursor: RealDictCursor,
        empleado_id: str,
        estado_factura: str | None,
        cliente_id: str | None,
        vencidas_solo: bool,
    ) -> int:
        where, values = PagosService._build_facturas_filters(empleado_id, estado_factura, cliente_id, vencidas_solo)
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
        where, values = PagosService._build_facturas_filters(empleado_id, estado_factura, cliente_id, vencidas_solo)
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
        return [
            {
                **dict(row),
                "total": float(row["total"] or 0),
                "pagado": float(row["pagado"] or 0),
                "pendiente": float(row["pendiente"] or 0),
            }
            for row in cursor.fetchall()
        ]

    @staticmethod
    def _count_pagos(
        cursor: RealDictCursor,
        empleado_id: str,
        cliente_id: str | None,
        fecha_pago_desde: str | None,
        fecha_pago_hasta: str | None,
    ) -> int:
        where, values = PagosService._build_pagos_filters(empleado_id, cliente_id, fecha_pago_desde, fecha_pago_hasta)
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
        where, values = PagosService._build_pagos_filters(empleado_id, cliente_id, fecha_pago_desde, fecha_pago_hasta)
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
        return [
            {**dict(row), "importe": float(row["importe"] or 0)}
            for row in cursor.fetchall()
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
