import hmac
import hashlib
import json

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import ValidationError

from models import InternalEventRequest
from service_config import settings
from services.notifications_service import NotificationsService

router = APIRouter(tags=["internal-events"])


@router.post("/internal/events")
async def receive_internal_event(
    request: Request,
    x_signature: str | None = Header(default=None, alias="X-Signature"),
):
    body = await request.body()
    expected = hmac.new(
        settings.internal_events_hmac_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not x_signature or not hmac.compare_digest(x_signature, f"sha256={expected}"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Firma HMAC inválida")

    try:
        payload = InternalEventRequest.model_validate(json.loads(body.decode("utf-8")))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=400, detail="Evento interno inválido") from exc

    return NotificationsService.handle_internal_event(payload)
