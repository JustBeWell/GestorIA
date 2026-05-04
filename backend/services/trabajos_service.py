from psycopg2.extras import RealDictCursor

from database import db_connection
from models import TrabajoCreate, TrabajoUpdate
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
                is_admin = usuario["rol"] == "administrador"
                resumen = TrabajosService.get_trabajos_resumen(cursor, empleado_id, is_admin=is_admin)
                total = TrabajosService._count_trabajos(
                    cursor, empleado_id, is_admin, estado, prioridad, cliente_id, fecha_desde, fecha_hasta,
                )
                trabajos = TrabajosService._get_trabajos_detalle(
                    cursor, empleado_id, is_admin, estado, prioridad, cliente_id, fecha_desde, fecha_hasta, page_size, offset,
                )

        return {
            "usuario": map_usuario(usuario),
            "resumen": resumen,
            "trabajos": trabajos,
            "paginacion": build_pagination_meta(page, page_size, total),
        }

    # ── CRUD ──────────────────────────────────────────────────────────────────

    @staticmethod
    def create_trabajo(payload: TrabajoCreate, user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                # Verify client exists and is active
                cursor.execute(
                    "SELECT id FROM clientes WHERE id = %s AND activo = TRUE",
                    (payload.cliente_id,),
                )
                if not cursor.fetchone():
                    raise ValueError("Cliente no encontrado o inactivo")

                cursor.execute(
                    """
                    INSERT INTO trabajos
                        (titulo, descripcion, cliente_id, prioridad, fecha_inicio,
                         fecha_objetivo, comentarios, creado_por)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id::text AS trabajo_id
                    """,
                    (
                        payload.titulo,
                        payload.descripcion,
                        payload.cliente_id,
                        payload.prioridad,
                        payload.fecha_inicio,
                        payload.fecha_objetivo,
                        payload.nota_bloqueo,
                        user_id,
                    ),
                )
                row = cursor.fetchone()
                connection.commit()
                trabajo_id = row["trabajo_id"]

        return TrabajosService.get_trabajo_detail(trabajo_id)

    @staticmethod
    def update_trabajo(trabajo_id: str, payload: TrabajoUpdate) -> dict | None:
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return TrabajosService.get_trabajo_detail(trabajo_id)

        # Map nota_bloqueo to DB column comentarios
        if "nota_bloqueo" in updates:
            updates["comentarios"] = updates.pop("nota_bloqueo")

        # Set fecha_cierre automatically when finalizado/cancelado
        if updates.get("estado") in ("finalizado", "cancelado") and "fecha_cierre" not in updates:
            updates["fecha_cierre_auto"] = True

        set_clauses_parts = []
        values = []
        for col, val in updates.items():
            if col == "fecha_cierre_auto":
                set_clauses_parts.append("fecha_cierre = CURRENT_DATE")
            else:
                set_clauses_parts.append(f"{col} = %s")
                values.append(val)

        set_clause = ", ".join(set_clauses_parts)
        values.append(trabajo_id)

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    f"""
                    UPDATE trabajos
                    SET {set_clause}, updated_at = NOW()
                    WHERE id = %s
                    RETURNING id::text AS trabajo_id
                    """,
                    values,
                )
                row = cursor.fetchone()
                if not row:
                    return None
                connection.commit()

        return TrabajosService.get_trabajo_detail(trabajo_id)

    @staticmethod
    def delete_trabajo(trabajo_id: str) -> bool:
        """Baja lógica: cancela el trabajo (no elimina físicamente)."""
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE trabajos
                    SET estado = 'cancelado', fecha_cierre = CURRENT_DATE, updated_at = NOW()
                    WHERE id = %s AND estado NOT IN ('cancelado', 'finalizado')
                    """,
                    (trabajo_id,),
                )
                affected = cursor.rowcount
                connection.commit()
                return affected > 0

    @staticmethod
    def get_trabajo_detail(trabajo_id: str) -> dict | None:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        t.id::text          AS trabajo_id,
                        t.nro_trabajo,
                        t.titulo,
                        t.descripcion,
                        t.estado::text      AS estado,
                        t.prioridad::text   AS prioridad,
                        c.id::text          AS cliente_id,
                        c.nombre_fiscal     AS cliente_nombre,
                        c.nro_cliente,
                        t.fecha_inicio,
                        t.fecha_objetivo,
                        t.fecha_cierre,
                        t.comentarios       AS nota_bloqueo,
                        CONCAT(e_u.nombre, ' ', e_u.apellidos) AS creado_por_nombre,
                        t.created_at
                    FROM trabajos t
                    JOIN clientes c      ON c.id = t.cliente_id
                    JOIN usuarios u      ON u.id = t.creado_por
                    JOIN empleados e_u   ON e_u.usuario_id = u.id
                    WHERE t.id = %s
                    """,
                    (trabajo_id,),
                )
                row = cursor.fetchone()
                if not row:
                    return None
                result = dict(row)
                result["empleados_asignados"] = TrabajosService._get_empleados_for_trabajo(cursor, trabajo_id)
                return result

    # ── Asignación de empleados ──────────────────────────────────────────────

    @staticmethod
    def get_empleados_asignados(trabajo_id: str) -> list[dict]:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                return TrabajosService._get_empleados_for_trabajo(cursor, trabajo_id)

    @staticmethod
    def assign_empleado(trabajo_id: str, empleado_id: str) -> list[dict]:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                # Verify work exists
                cursor.execute("SELECT id FROM trabajos WHERE id = %s", (trabajo_id,))
                if not cursor.fetchone():
                    raise ValueError("Trabajo no encontrado")
                # Verify employee exists and is active
                cursor.execute(
                    "SELECT id FROM empleados WHERE id = %s AND activo = TRUE",
                    (empleado_id,),
                )
                if not cursor.fetchone():
                    raise ValueError("Empleado no encontrado o inactivo")

                cursor.execute(
                    """
                    INSERT INTO trabajo_empleado (trabajo_id, empleado_id)
                    VALUES (%s, %s)
                    ON CONFLICT (trabajo_id, empleado_id) DO UPDATE
                        SET desasignado_en = NULL
                    """,
                    (trabajo_id, empleado_id),
                )
                connection.commit()
                return TrabajosService._get_empleados_for_trabajo(cursor, trabajo_id)

    @staticmethod
    def unassign_empleado(trabajo_id: str, empleado_id: str) -> bool:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE trabajo_empleado
                    SET desasignado_en = NOW()
                    WHERE trabajo_id = %s AND empleado_id = %s AND desasignado_en IS NULL
                    """,
                    (trabajo_id, empleado_id),
                )
                affected = cursor.rowcount
                connection.commit()
                return affected > 0

    # ── Comentarios ──────────────────────────────────────────────────────────

    @staticmethod
    def get_comentarios(trabajo_id: str) -> list[dict]:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        ct.id::text         AS comentario_id,
                        ct.trabajo_id::text AS trabajo_id,
                        ct.autor_id::text   AS autor_id,
                        CONCAT(e.nombre, ' ', e.apellidos) AS autor_nombre,
                        ct.texto,
                        ct.created_at
                    FROM comentarios_trabajo ct
                    JOIN usuarios u  ON u.id = ct.autor_id
                    JOIN empleados e ON e.usuario_id = u.id
                    WHERE ct.trabajo_id = %s
                    ORDER BY ct.created_at ASC
                    """,
                    (trabajo_id,),
                )
                return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def add_comentario(trabajo_id: str, user_id: str, texto: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT id FROM trabajos WHERE id = %s", (trabajo_id,))
                if not cursor.fetchone():
                    raise ValueError("Trabajo no encontrado")

                cursor.execute(
                    """
                    INSERT INTO comentarios_trabajo (trabajo_id, autor_id, texto)
                    VALUES (%s, %s, %s)
                    RETURNING
                        id::text         AS comentario_id,
                        trabajo_id::text AS trabajo_id,
                        autor_id::text   AS autor_id,
                        texto,
                        created_at
                    """,
                    (trabajo_id, user_id, texto),
                )
                row = cursor.fetchone()
                connection.commit()

                # Fetch author name
                cursor.execute(
                    """
                    SELECT CONCAT(e.nombre, ' ', e.apellidos) AS autor_nombre
                    FROM usuarios u JOIN empleados e ON e.usuario_id = u.id
                    WHERE u.id = %s
                    """,
                    (user_id,),
                )
                autor_row = cursor.fetchone()
                result = dict(row)
                result["autor_nombre"] = autor_row["autor_nombre"] if autor_row else ""
                return result

    # ── Semi-public helper (used by HomeService) ───────────────────────────────

    @staticmethod
    def get_trabajos_resumen(cursor: RealDictCursor, empleado_id: str, is_admin: bool = False) -> dict:
        if is_admin:
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
                    COUNT(*) FILTER (WHERE estado = 'en_curso') AS en_curso,
                    COUNT(*) FILTER (WHERE estado = 'bloqueado') AS bloqueados,
                    COUNT(*) FILTER (WHERE estado = 'finalizado') AS finalizados,
                    COUNT(*) FILTER (WHERE estado = 'cancelado') AS cancelados
                FROM trabajos
                """
            )
        else:
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
    def _get_empleados_for_trabajo(cursor: RealDictCursor, trabajo_id: str) -> list[dict]:
        cursor.execute(
            """
            SELECT
                e.id::text AS empleado_id,
                CONCAT(e.nombre, ' ', e.apellidos) AS nombre_completo
            FROM trabajo_empleado te
            JOIN empleados e ON e.id = te.empleado_id
            WHERE te.trabajo_id = %s AND te.desasignado_en IS NULL
            ORDER BY e.nombre
            """,
            (trabajo_id,),
        )
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def _count_trabajos(
        cursor: RealDictCursor,
        empleado_id: str,
        is_admin: bool,
        estado: str | None,
        prioridad: str | None,
        cliente_id: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> int:
        where, values = TrabajosService._build_trabajos_filters(
            empleado_id, is_admin, estado, prioridad, cliente_id, fecha_desde, fecha_hasta,
        )
        if is_admin:
            query = f"SELECT COUNT(DISTINCT t.id) AS total FROM trabajos t WHERE {where}"
        else:
            query = f"""
                SELECT COUNT(DISTINCT t.id) AS total
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                WHERE {where}
            """
        cursor.execute(query, values)
        row = cursor.fetchone() or {}
        return int(row.get("total") or 0)

    @staticmethod
    def _get_trabajos_detalle(
        cursor: RealDictCursor,
        empleado_id: str,
        is_admin: bool,
        estado: str | None,
        prioridad: str | None,
        cliente_id: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
        limit: int,
        offset: int,
    ) -> list[dict]:
        where, values = TrabajosService._build_trabajos_filters(
            empleado_id, is_admin, estado, prioridad, cliente_id, fecha_desde, fecha_hasta,
        )
        select_cols = """
            DISTINCT t.id::text AS trabajo_id,
            t.nro_trabajo,
            t.titulo,
            t.estado::text AS estado,
            t.prioridad::text AS prioridad,
            c.id::text AS cliente_id,
            c.nombre_fiscal AS cliente_nombre,
            c.nro_cliente,
            t.fecha_inicio,
            t.fecha_objetivo,
            t.fecha_cierre,
            t.comentarios AS nota_bloqueo
        """
        if is_admin:
            query = f"""
                SELECT {select_cols}
                FROM trabajos t
                JOIN clientes c ON c.id = t.cliente_id
                WHERE {where}
                ORDER BY t.updated_at DESC
                LIMIT %s OFFSET %s
            """
        else:
            query = f"""
                SELECT {select_cols}
                FROM trabajo_empleado te
                JOIN trabajos t ON t.id = te.trabajo_id
                JOIN clientes c ON c.id = t.cliente_id
                WHERE {where}
                ORDER BY t.updated_at DESC
                LIMIT %s OFFSET %s
            """
        cursor.execute(query, (*values, limit, offset))
        rows = [dict(row) for row in cursor.fetchall()]

        # Add employed list per trabajo
        for row in rows:
            row["empleados_asignados"] = TrabajosService._get_empleados_for_trabajo(cursor, row["trabajo_id"])

        return rows

    @staticmethod
    def _build_trabajos_filters(
        empleado_id: str,
        is_admin: bool,
        estado: str | None,
        prioridad: str | None,
        cliente_id: str | None,
        fecha_desde: str | None,
        fecha_hasta: str | None,
    ) -> tuple[str, list]:
        if is_admin:
            clauses: list[str] = ["1 = 1"]
            values: list = []
        else:
            clauses = ["te.empleado_id = %s", "te.desasignado_en IS NULL"]
            values = [empleado_id]

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
