from fastapi import APIRouter

from backend.main.app_factory import create_app
from routes.intranet.fichaje import router as fichaje_router

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(fichaje_router)

app = create_app("intranet-fichaje-service")
app.include_router(_intranet)
