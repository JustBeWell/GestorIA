from fastapi import APIRouter, Depends, Header, HTTPException, Request

from database import db_connection
from limiter import limiter
from models import LoginRequest, LoginResponse, OtpVerifyRequest, TokenResponse
from service_config import settings
from services.auth_service import TokenService, TwoFactorService, authenticate_user, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest):
    current_user = authenticate_user(payload.dni, payload.password)

    # Si Twilio está configurado, comprobar si el usuario tiene 2FA activo y teléfono
    if TwoFactorService.is_configured():
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT u.mfa_habilitado, e.telefono
                    FROM usuarios u
                    JOIN empleados e ON e.usuario_id = u.id
                    WHERE u.id = %s
                    """,
                    (current_user.user_id,),
                )
                row = cur.fetchone()
        if row and row[0] and row[1]:
            session_id, code = TwoFactorService.generate_and_store_otp(current_user.user_id)
            try:
                TwoFactorService.send_sms(row[1], code)
            except Exception as exc:
                # Limpiar el OTP generado ya que no se pudo entregar
                with db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM otp_codes WHERE id = %s", (session_id,))
                        conn.commit()
                raise HTTPException(
                    status_code=503,
                    detail=f"No se pudo enviar el SMS de verificación: {exc}",
                ) from exc
            return LoginResponse(requires_2fa=True, session_id=session_id)

    token, _ = TokenService.create_access_token(
        user_id=current_user.user_id,
        nombre_usuario=current_user.nombre_usuario,
    )
    return LoginResponse(
        requires_2fa=False,
        access_token=token,
        expires_in=TokenService.get_expiration_seconds(),
        user={
            "id": current_user.user_id,
            "nombre_usuario": current_user.nombre_usuario,
            "role": current_user.role,
        },
    )


@router.post("/otp/verify", response_model=LoginResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, payload: OtpVerifyRequest):
    """Valida el código OTP y devuelve el JWT completo si es correcto."""
    user_id = TwoFactorService.verify_otp(payload.session_id, payload.code)

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COALESCE(to_jsonb(u)->>'nombre_usuario', to_jsonb(u)->>'usuario') AS nombre_usuario,
                    u.rol::text
                FROM usuarios u
                WHERE u.id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nombre_usuario, role = row
    token, _ = TokenService.create_access_token(user_id=user_id, nombre_usuario=nombre_usuario)
    return LoginResponse(
        requires_2fa=False,
        access_token=token,
        expires_in=TokenService.get_expiration_seconds(),
        user={"id": user_id, "nombre_usuario": nombre_usuario, "role": role},
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
async def logout(
    current_user=Depends(get_current_user),
    authorization: str | None = Header(default=None),
):
    if authorization:
        _, _, token = authorization.partition(" ")
        if token:
            from datetime import datetime, timedelta, timezone
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=TokenService.get_expiration_seconds())
            TokenService.revoke_token(token, current_user.user_id, expires_at)
    return {"message": f"Sesión cerrada para {current_user.nombre_usuario}"}


@router.post("/logout/all")
async def logout_all(current_user=Depends(get_current_user)):
    TokenService.revoke_all_user_tokens(current_user.user_id)
    return {"message": f"Todas las sesiones cerradas para {current_user.nombre_usuario}"}
