"""
User Service - Main Application

FastAPI application for user management and authentication.
Handles OAuth authentication (Google) and user CRUD operations.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from database import check_database_connection
from routes import auth_router, intranet_router, users_router
from services.auth_service import get_current_user
from service_config import settings

app = FastAPI(
    title="User Service",
    description="Manages user authentication (OAuth) and user profiles",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
allowed_origins = {
    settings.frontend_url.rstrip("/"),
    "http://localhost:4200",
    "http://127.0.0.1:4200",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(intranet_router)


PUBLIC_PATHS = {
    "/",
    "/auth/login",
    "/auth/google/login",
    "/auth/google/callback",
    "/auth/google/token",
    "/health",
    "/health/db",
    "/docs",
    "/redoc",
    "/openapi.json"
}


@app.middleware("http")
async def require_token_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    if path in PUBLIC_PATHS:
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
async def root():
    """Root endpoint"""
    return {
        "service": "User Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration"""
    return {
        "status": "healthy",
        "service": "user-service"
    }


@app.get("/health/db")
async def database_health_check():
    """Health check endpoint for PostgreSQL connectivity"""
    is_connected, error = check_database_connection()
    return {
        "database": "gestoria",
        "connected": is_connected,
        "error": error
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
