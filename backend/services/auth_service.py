from datetime import datetime, timedelta, timezone
import hashlib
from uuid import UUID

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import db_connection
from models import TokenData
from service_config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenService:
    @staticmethod
    def create_access_token(user_id: str, nombre_usuario: str) -> tuple[str, datetime]:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
        payload = {
            "sub": user_id,
            "nombre_usuario": nombre_usuario,
            "exp": int(expires_at.timestamp()),
        }
        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        return token, expires_at

    @staticmethod
    def decode_token(token: str) -> TokenData:
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            user_id = payload.get("sub")
            nombre_usuario = payload.get("nombre_usuario")
            if not user_id or not nombre_usuario:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            return TokenData(user_id=user_id, nombre_usuario=nombre_usuario)
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def get_expiration_seconds() -> int:
        return settings.jwt_expiration_hours * 3600


def get_current_user(authorization: str | None = Header(default=None)) -> TokenData:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization format")

    token_data = TokenService.decode_token(token)
    return _enrich_user_role(token_data)


def _enrich_user_role(token_data: TokenData) -> TokenData:
    try:
        UUID(token_data.user_id)
    except ValueError:
        return token_data

    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COALESCE(to_jsonb(u)->>'nombre_usuario', to_jsonb(u)->>'usuario') AS nombre_usuario,
                    u.rol::text,
                    u.activo
                FROM usuarios u
                WHERE u.id = %s
                """,
                (token_data.user_id,),
            )
            row = cursor.fetchone()

    if not row:
        return token_data

    nombre_usuario, role, active = row
    if not active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

    return TokenData(user_id=token_data.user_id, nombre_usuario=token_data.nombre_usuario, role=role)


MAX_INTENTOS = 5
BLOQUEO_MINUTOS = 15


def authenticate_user(dni: str, password: str) -> TokenData:
    normalized_dni = dni.strip().upper()

    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.id,
                    COALESCE(to_jsonb(u)->>'nombre_usuario', to_jsonb(u)->>'usuario') AS nombre_usuario,
                    u.password_hash,
                    u.rol::text,
                    u.activo,
                    e.activo,
                    u.intentos_fallidos,
                    u.bloqueado_hasta
                FROM usuarios u
                JOIN empleados e ON e.usuario_id = u.id
                WHERE UPPER(e.nif) = %s
                LIMIT 1
                """,
                (normalized_dni,),
            )
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

            user_id, nombre_usuario, password_hash, role, active_user, active_employee, intentos, bloqueado_hasta = row

            if not active_user or not active_employee:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

            # Comprobar bloqueo temporal
            now = datetime.now(timezone.utc)
            if bloqueado_hasta and bloqueado_hasta > now:
                segundos_restantes = int((bloqueado_hasta - now).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Cuenta bloqueada temporalmente. Inténtalo en {segundos_restantes} segundos.",
                )

            # Verificar contraseña
            if not pwd_context.verify(password, password_hash):
                nuevos_intentos = (intentos or 0) + 1
                if nuevos_intentos >= MAX_INTENTOS:
                    nuevo_bloqueo = now + timedelta(minutes=BLOQUEO_MINUTOS)
                    cursor.execute(
                        "UPDATE usuarios SET intentos_fallidos = %s, bloqueado_hasta = %s WHERE id = %s",
                        (nuevos_intentos, nuevo_bloqueo, user_id),
                    )
                    connection.commit()
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Demasiados intentos fallidos. Cuenta bloqueada {BLOQUEO_MINUTOS} minutos.",
                    )
                cursor.execute(
                    "UPDATE usuarios SET intentos_fallidos = %s WHERE id = %s",
                    (nuevos_intentos, user_id),
                )
                connection.commit()
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

            # Login correcto: resetear contadores
            cursor.execute(
                "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW() WHERE id = %s",
                (user_id,),
            )
            connection.commit()

    return TokenData(user_id=str(user_id), nombre_usuario=nombre_usuario, role=role)
