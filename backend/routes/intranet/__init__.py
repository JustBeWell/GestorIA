from fastapi import APIRouter

from .admin import router as admin_router
from .calendario_fiscal import router as calendario_fiscal_router
from .clientes import router as clientes_router
from .fichaje import router as fichaje_router
from .home import router as home_router
from .notifications import router as notifications_router
from .pagos import router as pagos_router
from .trabajos import router as trabajos_router
from services.clientes_service import ClientesService
from services.fichaje_service import FichajeService
from services.home_service import HomeService
from services.pagos_service import PagosService
from services.trabajos_service import TrabajosService

IntranetService = HomeService

router = APIRouter(prefix="/intranet", tags=["intranet"])
router.include_router(home_router)
router.include_router(fichaje_router)
router.include_router(clientes_router)
router.include_router(trabajos_router)
router.include_router(pagos_router)
router.include_router(admin_router)
router.include_router(calendario_fiscal_router)
router.include_router(notifications_router)
