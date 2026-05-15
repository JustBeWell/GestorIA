from __future__ import annotations

import json
import logging
from datetime import timedelta

from psycopg2.extras import RealDictCursor

from database import db_connection
from service_config import settings

logger = logging.getLogger(__name__)


class PushDispatcherService:
    @staticmethod
    def deliver_pending(limit: int | None = None) -> int:
        batch_size = limit or settings.notif_outbox_batch_size
        delivered = 0
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT
                        o.id::text AS outbox_id,
                        o.intentos,
                        n.id::text AS notification_id,
                        n.destinatario_id::text,
                        n.titulo,
                        n.mensaje,
                        n.deep_link,
                        n.prioridad::text
                    FROM notification_outbox o
                    JOIN notifications n ON n.id = o.notification_id
                    WHERE o.estado = 'pending'
                      AND o.canal = 'web_push'
                      AND o.next_attempt_at <= NOW()
                    ORDER BY n.created_at ASC
                    LIMIT %s
                    FOR UPDATE SKIP LOCKED
                    """,
                    (batch_size,),
                )
                rows = [dict(row) for row in cursor.fetchall()]
                for row in rows:
                    ok = PushDispatcherService._deliver_row(cursor, row)
                    delivered += 1 if ok else 0
                connection.commit()
        return delivered

    @staticmethod
    def _deliver_row(cursor: RealDictCursor, row: dict) -> bool:
        cursor.execute(
            """
            SELECT id::text, endpoint, p256dh, auth
            FROM push_subscriptions
            WHERE usuario_id = %s AND activo = TRUE
            """,
            (row["destinatario_id"],),
        )
        subscriptions = [dict(sub) for sub in cursor.fetchall()]
        if not subscriptions:
            PushDispatcherService._mark_delivered(cursor, row["outbox_id"])
            return True

        all_sent = True
        for subscription in subscriptions:
            try:
                PushDispatcherService._send(subscription, row)
            except Exception as exc:
                all_sent = False
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                if status_code in (404, 410):
                    cursor.execute(
                        "UPDATE push_subscriptions SET activo = FALSE WHERE id = %s",
                        (subscription["id"],),
                    )
                else:
                    logger.warning("web_push_failed", exc_info=exc)
        if all_sent:
            PushDispatcherService._mark_delivered(cursor, row["outbox_id"])
            return True
        PushDispatcherService._schedule_retry(cursor, row)
        return False

    @staticmethod
    def _send(subscription: dict, row: dict) -> None:
        if not settings.push_vapid_private_key:
            return
        from pywebpush import webpush

        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {"p256dh": subscription["p256dh"], "auth": subscription["auth"]},
            },
            data=json.dumps(
                {
                    "title": row["titulo"],
                    "body": row["mensaje"],
                    "url": row["deep_link"] or "/",
                    "priority": row["prioridad"],
                    "tag": row["notification_id"],
                }
            ),
            vapid_private_key=settings.push_vapid_private_key,
            vapid_claims={"sub": settings.push_vapid_subject},
            ttl=86400,
        )

    @staticmethod
    def _mark_delivered(cursor: RealDictCursor, outbox_id: str) -> None:
        cursor.execute(
            """
            UPDATE notification_outbox
            SET estado = 'delivered', delivered_at = NOW(), error_detalle = NULL
            WHERE id = %s
            """,
            (outbox_id,),
        )

    @staticmethod
    def _schedule_retry(cursor: RealDictCursor, row: dict) -> None:
        next_intentos = int(row["intentos"] or 0) + 1
        if next_intentos >= settings.notif_outbox_max_retries:
            cursor.execute(
                """
                UPDATE notification_outbox
                SET estado = 'dropped', intentos = %s, error_detalle = %s
                WHERE id = %s
                """,
                (next_intentos, "max retries reached", row["outbox_id"]),
            )
            return
        delay = timedelta(minutes=2 ** next_intentos)
        cursor.execute(
            """
            UPDATE notification_outbox
            SET intentos = %s, next_attempt_at = NOW() + %s::interval, error_detalle = %s
            WHERE id = %s
            """,
            (next_intentos, str(delay), "web push delivery failed", row["outbox_id"]),
        )
