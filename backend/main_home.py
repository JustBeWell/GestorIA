from fastapi import APIRouter

from app_factory import create_app
from routes.intranet.home import router as home_router

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(home_router)

app = create_app("intranet-home-service")
app.include_router(_intranet)
