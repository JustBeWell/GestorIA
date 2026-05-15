import hashlib
import hmac
import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from main_notifications import app
from models import TokenData
from service_config import settings

client = TestClient(app)


def _auth_user(role="empleado"):
    return TokenData(
        user_id="11111111-1111-1111-1111-111111111111",
        nombre_usuario="user@gestoria.local",
        role=role,
    )


def test_list_notifications_requires_auth():
    response = client.get("/intranet/notifications")
    assert response.status_code == 401


@patch("services.auth_service.TokenService.decode_token")
@patch("routes.intranet.notifications.NotificationsService.list_notifications")
def test_list_notifications_returns_payload(mock_list, mock_decode):
    mock_decode.return_value = _auth_user()
    mock_list.return_value = {
        "notificaciones": [],
        "no_leidas": 0,
        "paginacion": {"page": 1, "page_size": 20, "total": 0, "total_pages": 0},
    }

    response = client.get("/intranet/notifications", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    assert response.json()["no_leidas"] == 0
    mock_list.assert_called_once()


@patch("services.auth_service.TokenService.decode_token")
@patch("routes.intranet.notifications.NotificationsService.update_preference")
def test_update_preference(mock_update, mock_decode):
    mock_decode.return_value = _auth_user()
    mock_update.return_value = {
        "tipo": "TASK_ASSIGNED",
        "canal_in_app": True,
        "canal_web_push": False,
        "canal_email": False,
        "silencio_desde": None,
        "silencio_hasta": None,
    }

    response = client.patch(
        "/intranet/notifications/preferencias/TASK_ASSIGNED",
        json={"canal_web_push": False},
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert response.json()["canal_web_push"] is False


@patch("services.auth_service.TokenService.decode_token")
@patch("routes.intranet.notifications.NotificationsService.admin_metrics")
def test_admin_metrics_requires_admin(mock_metrics, mock_decode):
    mock_decode.return_value = _auth_user(role="empleado")

    response = client.get("/intranet/notifications/admin/metricas", headers={"Authorization": "Bearer token"})

    assert response.status_code == 403
    mock_metrics.assert_not_called()


@patch("routes.internal.events.NotificationsService.handle_internal_event")
def test_internal_event_validates_hmac(mock_handle):
    payload = {"tipo": "TASK_ASSIGNED", "entidad": "trabajo", "entidad_id": "22222222-2222-2222-2222-222222222222"}
    body = json.dumps(payload).encode("utf-8")
    signature = hmac.new(settings.internal_events_hmac_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    mock_handle.return_value = {"emitidas": 1}

    response = client.post(
        "/internal/events",
        content=body,
        headers={"X-Signature": f"sha256={signature}", "Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json()["emitidas"] == 1


def test_internal_event_rejects_invalid_hmac():
    response = client.post(
        "/internal/events",
        json={"tipo": "TASK_ASSIGNED", "entidad": "trabajo", "entidad_id": "22222222-2222-2222-2222-222222222222"},
        headers={"X-Signature": "sha256=bad"},
    )

    assert response.status_code == 403
