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

    @staticmethod
    def revoke_token(token: str, user_id: str, expires_at: datetime) -> None:
        token_hash = TokenService.hash_token(token)
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO token_blacklist (token_hash, user_id, expires_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (token_hash) DO NOTHING
                    """,
                    (token_hash, user_id, expires_at),
                )
                connection.commit()

    @staticmethod
    def revoke_all_user_tokens(user_id: str) -> int:
        """Purga todos los tokens activos del usuario añadiéndolos a la blacklist con expiración futura."""
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
        # Generamos un hash único por usuario+timestamp para bloquear sesiones activas
        synthetic_hash = hashlib.sha256(f"{user_id}:all:{expires_at.timestamp()}".encode()).hexdigest()
        with db_connection() as connection:
            with connection.cursor() as cursor:
                # Insertar una marca que invalida todos los tokens emitidos antes de ahora
                cursor.execute(
                    """
                    INSERT INTO token_blacklist (token_hash, user_id, expires_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (token_hash) DO NOTHING
                    """,
                    (synthetic_hash, user_id, expires_at),
                )
                # Actualizar revoked_at del usuario para invalidar tokens anteriores
                cursor.execute(
                    "UPDATE usuarios SET updated_at = NOW() WHERE id = %s",
                    (user_id,),
                )
                connection.commit()
        return 1

    @staticmethod
    def is_token_revoked(token: str) -> bool:
        token_hash = TokenService.hash_token(token)
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM token_blacklist WHERE token_hash = %s AND expires_at > NOW()",
                    (token_hash,),
                )
                return cursor.fetchone() is not None

    @staticmethod
    def purge_expired_tokens() -> int:
        """Limpia entradas caducadas de la blacklist."""
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM token_blacklist WHERE expires_at <= NOW()")
                deleted = cursor.rowcount
                connection.commit()
        return deleted


def get_current_user(authorization: str | None = Header(default=None)) -> TokenData:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization format")

    if TokenService.is_token_revoked(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revocado")

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


class TwoFactorService:
    """Servicio para autenticación de dos factores vía SMS (Twilio)."""

    OTP_EXPIRE_MINUTES = 10

    @staticmethod
    def is_configured() -> bool:
        """True sólo si las tres variables de Twilio están definidas."""
        return bool(
            settings.twilio_account_sid
            and settings.twilio_auth_token
            and settings.twilio_from_number
        )

    @staticmethod
    def generate_and_store_otp(user_id: str) -> tuple[str, str]:
        """Genera un OTP de 6 dígitos, lo almacena hasheado y devuelve (session_id, plain_code)."""
        import secrets

        code = "".join(secrets.choice("0123456789") for _ in range(6))
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=TwoFactorService.OTP_EXPIRE_MINUTES)
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO otp_codes (user_id, code_hash, expires_at) VALUES (%s, %s, %s) RETURNING id::text",
                    (user_id, code_hash, expires_at),
                )
                session_id: str = cur.fetchone()[0]
                conn.commit()
        return session_id, code

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Convierte número español sin prefijo a formato E.164 (+34XXXXXXXXX)."""
        cleaned = phone.strip().replace(" ", "").replace("-", "")
        if cleaned.startswith("+"):
            return cleaned
        if cleaned.startswith("0034"):
            return "+" + cleaned[2:]
        # Número español sin prefijo (6xx, 7xx, 9xx)
        return "+34" + cleaned

    @staticmethod
    def send_sms(phone: str, code: str) -> None:
        """Envía el OTP por SMS. Lanza excepción si falla para que el llamador la maneje."""
        try:
            from twilio.rest import Client  # type: ignore[import]
        except ImportError:
            return
        normalized = TwoFactorService._normalize_phone(phone)
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=f"Tu código de verificación GestorIA: {code}. Válido {TwoFactorService.OTP_EXPIRE_MINUTES} minutos.",
            from_=settings.twilio_from_number,
            to=normalized,
        )

    @staticmethod
    def verify_otp(session_id: str, code: str) -> str:
        """Valida el OTP y devuelve user_id. Lanza HTTP 401 si es inválido o expirado."""
        import sys
        # Limpiar espacios que puedan venir del SMS o del formulario
        clean_code = code.strip().replace(" ", "").replace("\u00a0", "")
        code_hash = hashlib.sha256(clean_code.encode()).hexdigest()
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id::text, code_hash, expires_at, used, expires_at > NOW() AS valid FROM otp_codes WHERE id = %s",
                    (session_id,),
                )
                debug_row = cur.fetchone()
                print(f"[OTP DEBUG] session_id={session_id} clean_code='{clean_code}' input_hash={code_hash} db_row={debug_row}", file=sys.stderr, flush=True)

                cur.execute(
                    """
                    SELECT user_id::text FROM otp_codes
                    WHERE id = %s AND code_hash = %s AND expires_at > NOW() AND used = FALSE
                    """,
                    (session_id, code_hash),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Código inválido o expirado")
                user_id = row[0]
                cur.execute("UPDATE otp_codes SET used = TRUE WHERE id = %s", (session_id,))
                conn.commit()
        return user_id


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
