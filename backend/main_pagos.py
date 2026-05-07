from fastapi import APIRouter

from app_factory import create_app
from routes.intranet.pagos import router as pagos_router

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(pagos_router)

app = create_app("intranet-pagos-service")
app.include_router(_intranet)
