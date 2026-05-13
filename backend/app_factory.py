import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database import check_database_connection
from limiter import limiter
from service_config import settings
from services.auth_service import get_current_user

logging.basicConfig(level=logging.WARNING)

_BASE_PUBLIC_PATHS = {
    "/",
    "/health",
    "/health/db",
    "/docs",
    "/redoc",
    "/openapi.json",
}


def create_app(service_name: str, extra_public_paths: set[str] | None = None) -> FastAPI:
    app = FastAPI(
        title=service_name,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    allowed_origins = {
        settings.frontend_url.rstrip("/"),
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "app://localhost",
        "app://.",
    }
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(allowed_origins),
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    public_paths = _BASE_PUBLIC_PATHS | (extra_public_paths or set())

    @app.middleware("http")
    async def require_token_middleware(request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path in public_paths:
            return await call_next(request)
        authorization = request.headers.get("Authorization")
        try:
            get_current_user(authorization)
        except Exception as exc:
            status_code = getattr(exc, "status_code", 401)
            detail = getattr(exc, "detail", "Unauthorized")
            return JSONResponse(status_code=status_code, content={"detail": detail})
        return await call_next(request)

    @app.get("/")
    def root():
        return {"service": service_name, "status": "running", "version": "1.0.0"}

    @app.get("/health")
    def health_check():
        return {"status": "healthy", "service": service_name}

    @app.get("/health/db")
    def db_health():
        is_connected, error = check_database_connection()
        return {"database": "gestoria", "connected": is_connected, "error": error}

    return app
