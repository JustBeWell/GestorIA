from fastapi import APIRouter

from .admin import router as admin_router
from .clientes import router as clientes_router
from .fichaje import router as fichaje_router
from .home import router as home_router
from .pagos import router as pagos_router
from .trabajos import router as trabajos_router

router = APIRouter(prefix="/intranet", tags=["intranet"])
router.include_router(home_router)
router.include_router(fichaje_router)
router.include_router(clientes_router)
router.include_router(trabajos_router)
router.include_router(pagos_router)
router.include_router(admin_router)
