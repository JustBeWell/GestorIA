from fastapi import APIRouter

from backend.main.app_factory import create_app
from routes.intranet.clientes import router as clientes_router

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(clientes_router)

app = create_app("intranet-clientes-service")
app.include_router(_intranet)
