from .ai import router as ai_router
from .auth import router as auth_router
from .intranet import router as intranet_router
from .users import router as users_router

__all__ = ["ai_router", "auth_router", "users_router", "intranet_router"]
