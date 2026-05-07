from app_factory import create_app
from routes.ai import router as ai_router

app = create_app("ai-service")
app.include_router(ai_router)
