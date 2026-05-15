from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, WebSocket, WebSocketDisconnect, status

from models import (
    NotificationItem,
    NotificationPreferenceItem,
    NotificationPreferencesResponse,
    NotificationPreferenceUpdate,
    NotificationsCounterResponse,
    NotificationsListResponse,
    PushSubscriptionCreate,
    PushSubscriptionItem,
    PushSubscriptionsResponse,
)
from service_config import settings
from services.auth_service import get_current_user
from services.auth_service import TokenService
from services.notifications_service import NotificationsService

router = APIRouter(tags=["notifications"])


@router.websocket("/notifications/ws")
async def notifications_ws(websocket: WebSocket, token: str | None = None):
    if not token:
        await websocket.close(code=1008)
        return
    try:
        TokenService.decode_token(token)
    except Exception:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        return


@router.get("/notifications", response_model=NotificationsListResponse)
def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    solo_no_leidas: bool = Query(default=False),
    tipo: str | None = Query(default=None),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    archivadas: bool | None = Query(default=False),
    current_user=Depends(get_current_user),
):
    return NotificationsService.list_notifications(
        current_user.user_id,
        page=page,
        page_size=page_size,
        solo_no_leidas=solo_no_leidas,
        tipo=tipo,
        desde=desde,
        hasta=hasta,
        archivadas=archivadas,
    )


@router.get("/notifications/contador", response_model=NotificationsCounterResponse)
def notifications_counter(current_user=Depends(get_current_user)):
    return NotificationsService.counter(current_user.user_id)


@router.get("/notifications/preferencias", response_model=NotificationPreferencesResponse)
def notifications_preferences(current_user=Depends(get_current_user)):
    return NotificationsService.get_preferences(current_user.user_id)


@router.patch("/notifications/preferencias/{tipo}", response_model=NotificationPreferenceItem)
def update_notification_preference(
    tipo: str,
    payload: NotificationPreferenceUpdate,
    current_user=Depends(get_current_user),
):
    try:
        return NotificationsService.update_preference(current_user.user_id, tipo, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/notifications/vapid-public-key")
def vapid_public_key(current_user=Depends(get_current_user)):
    return {"publicKey": settings.push_vapid_public_key}


@router.get("/notifications/push-subscriptions", response_model=PushSubscriptionsResponse)
def list_push_subscriptions(current_user=Depends(get_current_user)):
    return NotificationsService.list_push_subscriptions(current_user.user_id)


@router.post("/notifications/push-subscriptions", response_model=PushSubscriptionItem, status_code=status.HTTP_201_CREATED)
def create_push_subscription(
    payload: PushSubscriptionCreate,
    current_user=Depends(get_current_user),
):
    return NotificationsService.create_push_subscription(current_user.user_id, payload)


@router.delete("/notifications/push-subscriptions/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_push_subscription(
    subscription_id: str,
    current_user=Depends(get_current_user),
):
    deleted = NotificationsService.delete_push_subscription(current_user.user_id, subscription_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/notifications/test", status_code=status.HTTP_201_CREATED)
def test_notification(current_user=Depends(get_current_user)):
    return NotificationsService.emit_test_notification(current_user.user_id)


@router.post("/notifications/leer-todas")
def mark_all_read(current_user=Depends(get_current_user)):
    return NotificationsService.mark_all_read(current_user.user_id)


@router.get("/notifications/admin/metricas")
def admin_metrics(current_user=Depends(get_current_user)):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return NotificationsService.admin_metrics()


@router.post("/notifications/admin/reenviar/{outbox_id}")
def admin_retry_outbox(outbox_id: str, current_user=Depends(get_current_user)):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Solo administradores")
    if not NotificationsService.admin_retry_outbox(outbox_id):
        raise HTTPException(status_code=404, detail="Outbox no encontrado")
    return {"estado": "pending"}


@router.get("/notifications/{notification_id}", response_model=NotificationItem)
def get_notification(notification_id: str, current_user=Depends(get_current_user)):
    result = NotificationsService.get_notification(current_user.user_id, notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return result


@router.post("/notifications/{notification_id}/leer", response_model=NotificationItem)
def mark_read(notification_id: str, current_user=Depends(get_current_user)):
    result = NotificationsService.mark_read(current_user.user_id, notification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return result


@router.post("/notifications/{notification_id}/archivar", status_code=status.HTTP_204_NO_CONTENT)
def archive_notification(notification_id: str, current_user=Depends(get_current_user)):
    archived = NotificationsService.archive(current_user.user_id, notification_id)
    if not archived:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(notification_id: str, current_user=Depends(get_current_user)):
    archived = NotificationsService.archive(current_user.user_id, notification_id)
    if not archived:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
