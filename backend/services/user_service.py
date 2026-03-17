from uuid import UUID

import psycopg2
from passlib.context import CryptContext

from database import db_connection
from models import UserAdminUpdateRequest, UserCreateRequest, UserUpdateRequest


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    @staticmethod
    def is_valid_user_id(user_id: str) -> bool:
        try:
            UUID(user_id)
            return True
        except ValueError:
            return False

    @staticmethod
    def exists(user_id: str) -> bool:
        if not UserService.is_valid_user_id(user_id):
            return False

        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT EXISTS(SELECT 1 FROM usuarios WHERE id = %s)",
                    (user_id,),
                )
                return bool(cursor.fetchone()[0])

    @staticmethod
    def list_users() -> list[dict]:
        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        e.id,
                        u.id AS usuario_id,
                        COALESCE(to_jsonb(u)->>'nombre_usuario', to_jsonb(u)->>'usuario') AS nombre_usuario,
                        e.nombre,
                        e.apellidos,
                        e.nif,
                        e.telefono,
                        u.rol::text,
                        u.activo,
                        e.fecha_alta,
                        e.fecha_baja,
                        u.created_at,
                        u.updated_at
                    FROM usuarios u
                    JOIN empleados e ON e.usuario_id = u.id
                    ORDER BY u.created_at DESC
                    """
                )
                rows = cursor.fetchall()
        return [UserService._map_user_row(row) for row in rows]

    @staticmethod
    def get(user_id: str) -> dict | None:
        if not UserService.is_valid_user_id(user_id):
            return None

        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        e.id,
                        u.id AS usuario_id,
                        COALESCE(to_jsonb(u)->>'nombre_usuario', to_jsonb(u)->>'usuario') AS nombre_usuario,
                        e.nombre,
                        e.apellidos,
                        e.nif,
                        e.telefono,
                        u.rol::text,
                        u.activo,
                        e.fecha_alta,
                        e.fecha_baja,
                        u.created_at,
                        u.updated_at
                    FROM usuarios u
                    JOIN empleados e ON e.usuario_id = u.id
                    WHERE u.id = %s
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
        if not row:
            return None
        return UserService._map_user_row(row)

    @staticmethod
    def create(payload: UserCreateRequest) -> dict:
        password_hash = pwd_context.hash(payload.password)
        fecha_alta = payload.fecha_alta

        with db_connection() as connection:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO usuarios (usuario, password_hash, rol)
                        VALUES (%s, %s, %s::rol_usuario)
                        RETURNING id
                        """,
                        (payload.nombre_usuario, password_hash, payload.rol),
                    )
                    usuario_id = cursor.fetchone()[0]

                    cursor.execute(
                        """
                        INSERT INTO empleados (
                            usuario_id, nombre, apellidos, nif, telefono, fecha_alta, activo
                        )
                        VALUES (%s, %s, %s, %s, %s, COALESCE(%s, CURRENT_DATE), TRUE)
                        RETURNING id
                        """,
                        (
                            str(usuario_id),
                            payload.nombre,
                            payload.apellidos,
                            payload.nif,
                            payload.telefono,
                            fecha_alta,
                        ),
                    )
                    cursor.fetchone()

                connection.commit()
            except psycopg2.Error:
                connection.rollback()
                raise

        created = UserService.get(str(usuario_id))
        if not created:
            raise RuntimeError("No se pudo recuperar el usuario creado")
        return created

    @staticmethod
    def update_self(user_id: str, payload: UserUpdateRequest) -> dict | None:
        if not UserService.is_valid_user_id(user_id):
            return None

        fields = payload.model_dump(exclude_none=True)
        if not fields:
            return UserService.get(user_id)

        set_parts = []
        values = []
        for key, value in fields.items():
            set_parts.append(f"{key} = %s")
            values.append(value)

        values.append(user_id)

        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"UPDATE empleados SET {', '.join(set_parts)} WHERE usuario_id = %s",
                    values,
                )
            connection.commit()

        return UserService.get(user_id)

    @staticmethod
    def admin_update(user_id: str, payload: UserAdminUpdateRequest) -> dict | None:
        if not UserService.is_valid_user_id(user_id):
            return None

        with db_connection() as connection:
            with connection.cursor() as cursor:
                if payload.rol is not None:
                    cursor.execute(
                        "UPDATE usuarios SET rol = %s::rol_usuario WHERE id = %s",
                        (payload.rol, user_id),
                    )
                if payload.activo is not None:
                    cursor.execute(
                        "UPDATE usuarios SET activo = %s WHERE id = %s",
                        (payload.activo, user_id),
                    )
                    cursor.execute(
                        """
                        UPDATE empleados
                        SET activo = %s,
                            fecha_baja = CASE WHEN %s THEN NULL ELSE CURRENT_DATE END
                        WHERE usuario_id = %s
                        """,
                        (payload.activo, payload.activo, user_id),
                    )
            connection.commit()

        return UserService.get(user_id)

    @staticmethod
    def delete(user_id: str) -> bool:
        if not UserService.is_valid_user_id(user_id):
            return False

        with db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE usuarios SET activo = FALSE WHERE id = %s",
                    (user_id,),
                )
                updated_usuarios = cursor.rowcount

                cursor.execute(
                    """
                    UPDATE empleados
                    SET activo = FALSE, fecha_baja = CURRENT_DATE
                    WHERE usuario_id = %s
                    """,
                    (user_id,),
                )
                updated_empleados = cursor.rowcount

            connection.commit()

        return updated_usuarios > 0 or updated_empleados > 0

    @staticmethod
    def _map_user_row(row: tuple) -> dict:
        return {
            "id": str(row[0]),
            "usuario_id": str(row[1]),
            "email": row[2],
            "nombre": row[3],
            "apellidos": row[4],
            "nif": row[5],
            "telefono": row[6],
            "rol": row[7],
            "activo": row[8],
            "fecha_alta": row[9],
            "fecha_baja": row[10],
            "created_at": row[11],
            "updated_at": row[12],
        }
