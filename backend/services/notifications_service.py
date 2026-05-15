from __future__ import annotations

from datetime import date, datetime
from typing import Any

from psycopg2.extras import Json, RealDictCursor

from database import db_connection
from models import (
    InternalEventRequest,
    NotificationPreferenceUpdate,
    PushSubscriptionCreate,
)
from services._shared import build_pagination_meta, normalize_pagination


NOTIFICATION_TYPES = [
    "INV_DUE_SOON",
    "INV_DUE_TODAY",
    "INV_OVERDUE_WEEKLY",
    "TASK_DEADLINE_SOON",
    "TASK_DEADLINE_TODAY",
    "TASK_ASSIGNED",
    "TASK_UNASSIGNED",
    "TASK_STATE_CHANGED",
    "TASK_CANCELLED",
    "TASK_COMMENT_NEW",
    "TASK_PRIORITY_CHANGED",
]


class NotificationsService:
    @staticmethod
    def list_notifications(
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        solo_no_leidas: bool = False,
        tipo: str | None = None,
        desde: date | None = None,
        hasta: date | None = None,
        archivadas: bool | None = False,
    ) -> dict:
        page, page_size, offset = normalize_pagination(page, page_size)
        where, values = NotificationsService._build_filters(
            user_id=user_id,
            solo_no_leidas=solo_no_leidas,
            tipo=tipo,
            desde=desde,
            hasta=hasta,
            archivadas=archivadas,
        )
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(f"SELECT COUNT(*) AS total FROM notifications WHERE {where}", values)
                total = int((cursor.fetchone() or {}).get("total") or 0)
                cursor.execute(
                    f"""
                    SELECT
                        id::text,
                        tipo::text,
                        prioridad::text,
                        titulo,
                        mensaje,
                        entidad,
                        entidad_id::text,
                        deep_link,
                        metadata,
                        leida_at IS NOT NULL AS leida,
                        archivada_at IS NOT NULL AS archivada,
                        created_at
                    FROM notifications
                    WHERE {where}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    [*values, page_size, offset],
                )
                rows = [dict(row) for row in cursor.fetchall()]
                no_leidas = NotificationsService._count_unread(cursor, user_id)

        return {
            "notificaciones": rows,
            "no_leidas": no_leidas,
            "paginacion": build_pagination_meta(page, page_size, total),
        }

    @staticmethod
    def get_notification(user_id: str, notification_id: str) -> dict | None:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        id::text,
                        tipo::text,
                        prioridad::text,
                        titulo,
                        mensaje,
                        entidad,
                        entidad_id::text,
                        deep_link,
                        metadata,
                        leida_at IS NOT NULL AS leida,
                        archivada_at IS NOT NULL AS archivada,
                        created_at
                    FROM notifications
                    WHERE id = %s AND destinatario_id = %s
                    """,
                    (notification_id, user_id),
                )
                row = cursor.fetchone()
                return dict(row) if row else None

    @staticmethod
    def mark_read(user_id: str, notification_id: str) -> dict | None:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    UPDATE notifications
                    SET leida_at = COALESCE(leida_at, NOW())
                    WHERE id = %s AND destinatario_id = %s
                    RETURNING id::text
                    """,
                    (notification_id, user_id),
                )
                row = cursor.fetchone()
                connection.commit()
        if not row:
            return None
        return NotificationsService.get_notification(user_id, notification_id)

    @staticmethod
    def mark_all_read(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    UPDATE notifications
                    SET leida_at = COALESCE(leida_at, NOW())
                    WHERE destinatario_id = %s
                      AND leida_at IS NULL
                      AND archivada_at IS NULL
                    """,
                    (user_id,),
                )
                updated = cursor.rowcount
                connection.commit()
        return {"actualizadas": updated}

    @staticmethod
    def archive(user_id: str, notification_id: str) -> bool:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE notifications
                    SET archivada_at = COALESCE(archivada_at, NOW())
                    WHERE id = %s AND destinatario_id = %s
                    """,
                    (notification_id, user_id),
                )
                affected = cursor.rowcount
                connection.commit()
                return affected > 0

    @staticmethod
    def counter(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        COUNT(*) FILTER (
                            WHERE leida_at IS NULL AND archivada_at IS NULL
                        ) AS no_leidas,
                        COUNT(*) FILTER (
                            WHERE leida_at IS NULL
                              AND archivada_at IS NULL
                              AND prioridad = 'critica'
                        ) AS criticas
                    FROM notifications
                    WHERE destinatario_id = %s
                    """,
                    (user_id,),
                )
                row = cursor.fetchone() or {}
        return {"no_leidas": int(row.get("no_leidas") or 0), "criticas": int(row.get("criticas") or 0)}

    @staticmethod
    def get_preferences(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    WITH tipos AS (
                        SELECT unnest(enum_range(NULL::notif_tipo)) AS tipo
                    )
                    SELECT
                        t.tipo::text,
                        COALESCE(p.canal_in_app, TRUE) AS canal_in_app,
                        COALESCE(p.canal_web_push, TRUE) AS canal_web_push,
                        COALESCE(p.canal_email, FALSE) AS canal_email,
                        to_char(p.silencio_desde, 'HH24:MI') AS silencio_desde,
                        to_char(p.silencio_hasta, 'HH24:MI') AS silencio_hasta
                    FROM tipos t
                    LEFT JOIN notification_preferences p
                      ON p.tipo = t.tipo AND p.usuario_id = %s
                    ORDER BY t.tipo::text
                    """,
                    (user_id,),
                )
                rows = [dict(row) for row in cursor.fetchall()]
        return {"preferencias": rows}

    @staticmethod
    def update_preference(user_id: str, tipo: str, payload: NotificationPreferenceUpdate) -> dict:
        if tipo not in NOTIFICATION_TYPES:
            raise ValueError("Tipo de notificación no soportado")

        current = {
            "canal_in_app": True,
            "canal_web_push": True,
            "canal_email": False,
            "silencio_desde": None,
            "silencio_hasta": None,
        }
        patch = payload.model_dump(exclude_unset=True)
        current.update(patch)

        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    INSERT INTO notification_preferences
                        (usuario_id, tipo, canal_in_app, canal_web_push, canal_email,
                         silencio_desde, silencio_hasta)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (usuario_id, tipo) DO UPDATE
                    SET canal_in_app = COALESCE(%s, notification_preferences.canal_in_app),
                        canal_web_push = COALESCE(%s, notification_preferences.canal_web_push),
                        canal_email = COALESCE(%s, notification_preferences.canal_email),
                        silencio_desde = COALESCE(%s, notification_preferences.silencio_desde),
                        silencio_hasta = COALESCE(%s, notification_preferences.silencio_hasta),
                        updated_at = NOW()
                    RETURNING
                        tipo::text,
                        canal_in_app,
                        canal_web_push,
                        canal_email,
                        to_char(silencio_desde, 'HH24:MI') AS silencio_desde,
                        to_char(silencio_hasta, 'HH24:MI') AS silencio_hasta
                    """,
                    (
                        user_id,
                        tipo,
                        current["canal_in_app"],
                        current["canal_web_push"],
                        current["canal_email"],
                        current["silencio_desde"],
                        current["silencio_hasta"],
                        patch.get("canal_in_app"),
                        patch.get("canal_web_push"),
                        patch.get("canal_email"),
                        patch.get("silencio_desde"),
                        patch.get("silencio_hasta"),
                    ),
                )
                row = dict(cursor.fetchone())
                connection.commit()
        return row

    @staticmethod
    def list_push_subscriptions(user_id: str) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        id::text,
                        endpoint,
                        user_agent,
                        plataforma,
                        activo,
                        last_seen_at,
                        created_at
                    FROM push_subscriptions
                    WHERE usuario_id = %s
                    ORDER BY last_seen_at DESC
                    """,
                    (user_id,),
                )
                rows = [dict(row) for row in cursor.fetchall()]
        return {"suscripciones": rows}

    @staticmethod
    def create_push_subscription(user_id: str, payload: PushSubscriptionCreate) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    INSERT INTO push_subscriptions
                        (usuario_id, endpoint, p256dh, auth, user_agent, plataforma, activo, last_seen_at)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE, NOW())
                    ON CONFLICT (endpoint) DO UPDATE
                    SET usuario_id = EXCLUDED.usuario_id,
                        p256dh = EXCLUDED.p256dh,
                        auth = EXCLUDED.auth,
                        user_agent = EXCLUDED.user_agent,
                        plataforma = EXCLUDED.plataforma,
                        activo = TRUE,
                        last_seen_at = NOW()
                    RETURNING
                        id::text,
                        endpoint,
                        user_agent,
                        plataforma,
                        activo,
                        last_seen_at,
                        created_at
                    """,
                    (
                        user_id,
                        payload.endpoint,
                        payload.keys["p256dh"],
                        payload.keys["auth"],
                        payload.user_agent,
                        payload.plataforma,
                    ),
                )
                row = dict(cursor.fetchone())
                connection.commit()
        return row

    @staticmethod
    def delete_push_subscription(user_id: str, subscription_id: str) -> bool:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE push_subscriptions
                    SET activo = FALSE
                    WHERE id = %s AND usuario_id = %s
                    """,
                    (subscription_id, user_id),
                )
                affected = cursor.rowcount
                connection.commit()
                return affected > 0

    @staticmethod
    def emit(
        destinatario_id: str,
        tipo: str,
        titulo: str,
        mensaje: str,
        entidad: str,
        entidad_id: str,
        prioridad: str = "media",
        deep_link: str | None = None,
        metadata: dict[str, Any] | None = None,
        dedupe_key: tuple[str, str, date] | None = None,
    ) -> str | None:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                if dedupe_key:
                    cursor.execute(
                        """
                        INSERT INTO notification_dedupe (tipo, entidad_id, fecha_logica)
                        VALUES (%s, %s, %s)
                        ON CONFLICT DO NOTHING
                        RETURNING tipo
                        """,
                        dedupe_key,
                    )
                    if cursor.fetchone() is None:
                        connection.rollback()
                        return None

                cursor.execute(
                    """
                    SELECT
                        COALESCE(canal_in_app, TRUE) AS canal_in_app,
                        COALESCE(canal_web_push, TRUE) AS canal_web_push
                    FROM notification_preferences
                    WHERE usuario_id = %s AND tipo = %s
                    """,
                    (destinatario_id, tipo),
                )
                pref = cursor.fetchone() or {"canal_in_app": True, "canal_web_push": True}
                if not pref["canal_in_app"] and not pref["canal_web_push"]:
                    connection.rollback()
                    return None

                cursor.execute(
                    """
                    INSERT INTO notifications
                        (destinatario_id, tipo, prioridad, titulo, mensaje, entidad,
                         entidad_id, deep_link, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id::text
                    """,
                    (
                        destinatario_id,
                        tipo,
                        prioridad,
                        titulo,
                        mensaje,
                        entidad,
                        entidad_id,
                        deep_link,
                        Json(metadata or {}),
                    ),
                )
                notification_id = cursor.fetchone()["id"]
                if pref["canal_in_app"]:
                    cursor.execute(
                        """
                        INSERT INTO notification_outbox (notification_id, canal, estado, delivered_at)
                        VALUES (%s, 'in_app', 'delivered', NOW())
                        """,
                        (notification_id,),
                    )
                if pref["canal_web_push"]:
                    cursor.execute(
                        "INSERT INTO notification_outbox (notification_id, canal) VALUES (%s, 'web_push')",
                        (notification_id,),
                    )
                if dedupe_key:
                    cursor.execute(
                        """
                        UPDATE notification_dedupe
                        SET notification_id = %s
                        WHERE tipo = %s AND entidad_id = %s AND fecha_logica = %s
                        """,
                        (notification_id, *dedupe_key),
                    )
                connection.commit()
                return notification_id

    @staticmethod
    def emit_test_notification(user_id: str) -> dict:
        notification_id = NotificationsService.emit(
            destinatario_id=user_id,
            tipo="TASK_ASSIGNED",
            prioridad="media",
            titulo="Notificación de prueba",
            mensaje="El canal de notificaciones está configurado correctamente.",
            entidad="usuario",
            entidad_id=user_id,
            deep_link="/notificaciones",
            metadata={"test": True},
        )
        return {"notification_id": notification_id}

    @staticmethod
    def handle_internal_event(event: InternalEventRequest) -> dict:
        if event.tipo.startswith("TASK_"):
            return NotificationsService.emit_task_event(
                trabajo_id=event.entidad_id,
                tipo=event.tipo,
                actor_id=event.actor_id,
                payload=event.payload,
            )
        return {"emitidas": 0}

    @staticmethod
    def emit_task_event(
        trabajo_id: str,
        tipo: str,
        actor_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict:
        payload = payload or {}
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                trabajo = NotificationsService._get_trabajo_context(cursor, trabajo_id)
                if not trabajo:
                    return {"emitidas": 0}
                destinatarios = NotificationsService._task_recipients(cursor, trabajo_id)
                if tipo == "TASK_ASSIGNED" and payload.get("empleado_id"):
                    destinatarios = NotificationsService._users_for_empleados(cursor, [payload["empleado_id"]])
                if tipo == "TASK_UNASSIGNED" and payload.get("empleado_id"):
                    destinatarios = NotificationsService._users_for_empleados(cursor, [payload["empleado_id"]])
                if tipo == "TASK_COMMENT_NEW" and actor_id:
                    destinatarios = [uid for uid in destinatarios if uid != actor_id]

        titulo, mensaje, prioridad = NotificationsService._render_task_message(tipo, trabajo, payload)
        emitidas = 0
        for user_id in destinatarios:
            if NotificationsService.emit(
                destinatario_id=user_id,
                tipo=tipo,
                prioridad=prioridad,
                titulo=titulo,
                mensaje=mensaje,
                entidad="trabajo",
                entidad_id=trabajo_id,
                deep_link=f"/trabajos/{trabajo_id}",
                metadata={"trabajo_id": trabajo_id, **payload},
            ):
                emitidas += 1
        return {"emitidas": emitidas}

    @staticmethod
    def admin_metrics() -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE n.created_at >= NOW() - INTERVAL '24 hours') AS emitidas_24h,
                        COUNT(*) FILTER (WHERE o.estado = 'delivered') AS delivered,
                        COUNT(*) FILTER (WHERE o.estado = 'failed') AS failed,
                        COUNT(*) FILTER (WHERE o.estado = 'dropped') AS dropped
                    FROM notifications n
                    LEFT JOIN notification_outbox o ON o.notification_id = n.id
                    """
                )
                totals = dict(cursor.fetchone() or {})
                cursor.execute(
                    """
                    SELECT tipo::text, COUNT(*) AS total
                    FROM notifications
                    GROUP BY tipo
                    ORDER BY tipo::text
                    """
                )
                by_type = [dict(row) for row in cursor.fetchall()]
        return {"totales": totals, "por_tipo": by_type}

    @staticmethod
    def admin_retry_outbox(outbox_id: str) -> bool:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE notification_outbox
                    SET estado = 'pending',
                        next_attempt_at = NOW(),
                        error_detalle = NULL
                    WHERE id = %s
                    """,
                    (outbox_id,),
                )
                affected = cursor.rowcount
                connection.commit()
        return affected > 0

    @staticmethod
    def _build_filters(
        user_id: str,
        solo_no_leidas: bool,
        tipo: str | None,
        desde: date | None,
        hasta: date | None,
        archivadas: bool | None,
    ) -> tuple[str, list[Any]]:
        clauses = ["destinatario_id = %s"]
        values: list[Any] = [user_id]
        if solo_no_leidas:
            clauses.append("leida_at IS NULL")
        if archivadas is True:
            clauses.append("archivada_at IS NOT NULL")
        elif archivadas is False:
            clauses.append("archivada_at IS NULL")
        if tipo:
            clauses.append("tipo::text = %s")
            values.append(tipo)
        if desde:
            clauses.append("created_at::date >= %s")
            values.append(desde)
        if hasta:
            clauses.append("created_at::date <= %s")
            values.append(hasta)
        return " AND ".join(clauses), values

    @staticmethod
    def _count_unread(cursor: RealDictCursor, user_id: str) -> int:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM notifications
            WHERE destinatario_id = %s
              AND leida_at IS NULL
              AND archivada_at IS NULL
            """,
            (user_id,),
        )
        return int((cursor.fetchone() or {}).get("total") or 0)

    @staticmethod
    def _get_trabajo_context(cursor: RealDictCursor, trabajo_id: str) -> dict | None:
        cursor.execute(
            """
            SELECT
                t.id::text,
                t.titulo,
                t.estado::text,
                t.prioridad::text,
                t.fecha_objetivo,
                c.nombre_fiscal AS cliente_nombre
            FROM trabajos t
            JOIN clientes c ON c.id = t.cliente_id
            WHERE t.id = %s
            """,
            (trabajo_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def _task_recipients(cursor: RealDictCursor, trabajo_id: str) -> list[str]:
        cursor.execute(
            """
            SELECT DISTINCT e.usuario_id::text AS usuario_id
            FROM trabajo_empleado te
            JOIN empleados e ON e.id = te.empleado_id
            WHERE te.trabajo_id = %s AND te.desasignado_en IS NULL
            UNION
            SELECT id::text AS usuario_id
            FROM usuarios
            WHERE rol = 'administrador' AND activo = TRUE
            """,
            (trabajo_id,),
        )
        return [row["usuario_id"] for row in cursor.fetchall()]

    @staticmethod
    def _users_for_empleados(cursor: RealDictCursor, empleado_ids: list[str]) -> list[str]:
        cursor.execute(
            """
            SELECT usuario_id::text
            FROM empleados
            WHERE id = ANY(%s::uuid[])
            """,
            (empleado_ids,),
        )
        return [row["usuario_id"] for row in cursor.fetchall()]

    @staticmethod
    def _render_task_message(tipo: str, trabajo: dict, payload: dict[str, Any]) -> tuple[str, str, str]:
        title = trabajo.get("titulo", "Trabajo")
        cliente = trabajo.get("cliente_nombre") or "cliente"
        if tipo == "TASK_ASSIGNED":
            return "Te han asignado un trabajo", f'"{title}" para {cliente}', "media"
        if tipo == "TASK_UNASSIGNED":
            return "Te han retirado de un trabajo", f'Ya no estás asignado a "{title}".', "media"
        if tipo == "TASK_CANCELLED":
            return "Trabajo cancelado", f'"{title}" ha sido cancelado.', "alta"
        if tipo == "TASK_STATE_CHANGED":
            estado = payload.get("estado") or trabajo.get("estado")
            _ESTADO_LABELS = {
                "pendiente": "pendiente", "en_curso": "en curso",
                "bloqueado": "bloqueado", "finalizado": "finalizado", "cancelado": "cancelado",
            }
            estado_label = _ESTADO_LABELS.get(estado, estado)
            return "Estado actualizado", f'"{title}" pasa a {estado_label}.', "media"
        if tipo == "TASK_PRIORITY_CHANGED":
            prioridad = payload.get("prioridad") or trabajo.get("prioridad")
            _PRIORIDAD_LABELS = {
                "urgente": "urgente", "alta": "alta", "media": "media",
                "baja": "baja", "no_aplica": "sin prioridad asignada",
            }
            prioridad_label = _PRIORIDAD_LABELS.get(prioridad, prioridad)
            return "Prioridad actualizada", f'"{title}" pasa a prioridad {prioridad_label}.', "media"
        if tipo == "TASK_COMMENT_NEW":
            preview = str(payload.get("texto") or "").strip()
            if len(preview) > 120:
                preview = f"{preview[:117]}..."
            return "Nuevo comentario", f'{payload.get("autor_nombre", "Un usuario")} en "{title}": {preview}', "media"
        if tipo == "TASK_DEADLINE_TODAY":
            return "Trabajo vence hoy", f'"{title}" vence hoy.', "alta"
        return "Vencimiento próximo", f'"{title}" vence en {payload.get("dias", "")} días.', "alta"
