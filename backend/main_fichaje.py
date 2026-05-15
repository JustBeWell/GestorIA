import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, FastAPI

from app_factory import create_app
from routes.intranet.fichaje import router as fichaje_router
from services.fichaje_service import FichajeService

_MADRID_TZ = ZoneInfo("Europe/Madrid")
_logger = logging.getLogger("fichaje.scheduler")


async def _daily_fichaje_closer() -> None:
    while True:
        now = datetime.now(_MADRID_TZ)
        target = now.replace(hour=23, minute=0, second=0, microsecond=0)
        if now >= target:
            target += timedelta(days=1)
        wait_seconds = (target - now).total_seconds()
        _logger.info(
            "Auto-cierre fichajes programado en %.0f s (a las %s)",
            wait_seconds,
            target.strftime("%Y-%m-%d %H:%M %Z"),
        )
        await asyncio.sleep(wait_seconds)
        try:
            result = FichajeService.cerrar_fichajes_abiertos()
            _logger.info("Auto-cierre fichajes completado: %s", result)
        except Exception:
            _logger.exception("Error en el auto-cierre de fichajes")


async def _startup_fichaje_closer() -> None:
    """Cierra fichajes abiertos del mes en curso (días anteriores al de hoy)."""
    desde = date.today().replace(day=1)
    hasta = date.today()  # excluye el día actual (turno puede seguir abierto)
    try:
        result = await asyncio.to_thread(
            FichajeService.cerrar_fichajes_abiertos, desde, hasta
        )
        _logger.info(
            "Cierre inicial de fichajes: %d registros cerrados (desde %s hasta %s)",
            result["cerrados"], desde, hasta,
        )
    except Exception:
        _logger.exception("Error en el cierre inicial de fichajes al arranque")


_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(fichaje_router)

app = create_app("intranet-fichaje-service")
app.include_router(_intranet)


@app.on_event("startup")
async def _start_scheduler() -> None:
    asyncio.create_task(_daily_fichaje_closer(), name="fichaje-auto-close")
    asyncio.create_task(_startup_fichaje_closer(), name="fichaje-startup-close")
