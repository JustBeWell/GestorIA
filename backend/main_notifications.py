from contextlib import asynccontextmanager

from fastapi import APIRouter

from app_factory import create_app
from routes.internal.events import router as internal_events_router
from routes.intranet.notifications import router as notifications_router
from service_config import settings
from services.notifications_outbox import OutboxWorker
from services.notifications_scheduler import register_jobs


@asynccontextmanager
async def lifespan(app):
    scheduler = None
    worker = OutboxWorker()
    try:
        from apscheduler.schedulers.background import BackgroundScheduler

        scheduler = BackgroundScheduler(timezone=settings.timezone)
        register_jobs(scheduler)
        scheduler.start()
    except Exception:
        scheduler = None
    worker.start()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)
    worker.stop()


_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(notifications_router)

app = create_app(
    "intranet-notifications-service",
    extra_public_paths={"/internal/events"},
)
app.router.lifespan_context = lifespan
app.include_router(_intranet)
app.include_router(internal_events_router)
