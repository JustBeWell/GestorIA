from datetime import date, datetime
from zoneinfo import ZoneInfo

from psycopg2.extras import RealDictCursor

MADRID_TZ = ZoneInfo("Europe/Madrid")
MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def get_usuario(cursor: RealDictCursor, user_id: str) -> dict | None:
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


def normalize_pagination(page: int, page_size: int) -> tuple[int, int, int]:
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    offset = (page - 1) * page_size
    return page, page_size, offset


def build_pagination_meta(page: int, page_size: int, total: int) -> dict:
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


def map_usuario(usuario: dict) -> dict:
    return {
        "usuario_id": usuario["usuario_id"],
        "empleado_id": usuario["empleado_id"],
        "nombre_usuario": usuario["nombre_usuario"],
        "nombre_completo": f"{usuario['nombre']} {usuario['apellidos']}".strip(),
        "rol": usuario["rol"],
    }
