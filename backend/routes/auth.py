from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from models import GoogleTokenRequest, LoginRequest, TokenResponse
from service_config import settings
from services.auth_service import TokenService, authenticate_user, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    current_user = authenticate_user(payload.dni, payload.password)
    token, _ = TokenService.create_access_token(
        user_id=current_user.user_id,
        nombre_usuario=current_user.nombre_usuario,
    )
    return TokenResponse(
        access_token=token,
        expires_in=TokenService.get_expiration_seconds(),
        user={
            "id": current_user.user_id,
            "nombre_usuario": current_user.nombre_usuario,
            "role": current_user.role,
        },
    )

@router.get("/token")
async def get_token(current_user=Depends(get_current_user)):
    token, expires_at = TokenService.create_access_token(
        user_id=current_user.user_id,
        nombre_usuario=current_user.nombre_usuario,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": expires_at.isoformat(),
        "user": {"id": current_user.user_id, "nombre_usuario": current_user.nombre_usuario},
    }

@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    return {"message": f"Logout successful for {current_user.nombre_usuario}"}


@router.post("/logout/all")
async def logout_all(current_user=Depends(get_current_user)):
    return {"message": f"All sessions closed for {current_user.nombre_usuario}"}
