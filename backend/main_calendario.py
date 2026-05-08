from fastapi import APIRouter

from app_factory import create_app
from routes.intranet.calendario_fiscal import router as calendario_fiscal_router

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(calendario_fiscal_router)

app = create_app("intranet-calendario-fiscal-service")
app.include_router(_intranet)
