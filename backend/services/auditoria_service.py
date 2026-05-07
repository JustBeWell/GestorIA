"""Servicio de auditoría.

Expone una sola función pública — ``registrar_evento`` — que persiste
una fila en ``auditoria_eventos``.  El fallo de la inserción es silencioso:
se registra en el log pero **nunca propaga una excepción al caller**, para
que un error de auditoría no anule la transacción principal.
"""

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
    accion: str,          # valor del ENUM accion_auditoria
    detalle: dict | None = None,
    ip: str | None = None,
) -> None:
    """Inserta un evento en ``auditoria_eventos``.

    Parámetros
    ----------
    actor_id:      UUID del usuario que realizó la acción.
    actor_nombre:  Nombre legible del actor (denormalizado).
    entidad:       Nombre de la entidad afectada ('cliente', 'trabajo', …).
    entidad_id:    ID (string) de la entidad afectada.
    accion:        Valor del ENUM ``accion_auditoria`` de PostgreSQL.
    detalle:       Diccionario opcional con snapshot / metadatos.
    ip:            IP del cliente (puede ser None).
    """
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
