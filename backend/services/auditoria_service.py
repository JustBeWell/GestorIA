from __future__ import annotations

import json
import logging

from psycopg2.extras import RealDictCursor

from database import db_connection

logger = logging.getLogger(__name__)


def registrar_evento(
    *,
    actor_id: str,
    actor_nombre: str,
    entidad: str,
    entidad_id: str,
    accion: str,
    detalle: dict | None = None,
    ip: str | None = None,
) -> None:
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO auditoria_eventos
                        (actor_id, actor_nombre, entidad, entidad_id, accion, detalle_json, ip)
                    VALUES (%s, %s, %s, %s, %s::accion_auditoria, %s, %s)
                    """,
                    (
                        actor_id,
                        actor_nombre,
                        entidad,
                        str(entidad_id),
                        accion,
                        json.dumps(detalle) if detalle else None,
                        ip,
                    ),
                )
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Error al registrar evento de auditoría: %s", exc)
