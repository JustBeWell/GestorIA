from backend.main.app_factory import create_app
from routes.auth import router as auth_router
from routes.users import router as users_router

app = create_app(
    "auth-service",
    extra_public_paths={"/auth/login", "/auth/otp/verify"},
)
app.include_router(auth_router)
app.include_router(users_router)
