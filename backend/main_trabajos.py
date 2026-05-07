from fastapi import APIRouter

from app_factory import create_app
from routes.intranet.trabajos import router as trabajos_router

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(trabajos_router)

app = create_app("intranet-trabajos-service")
app.include_router(_intranet)
