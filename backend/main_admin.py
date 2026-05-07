from fastapi import APIRouter

from app_factory import create_app
from routes.intranet.admin import router as admin_router

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(admin_router)

app = create_app("intranet-admin-service")
app.include_router(_intranet)
