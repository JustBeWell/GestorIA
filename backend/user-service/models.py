from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenData(BaseModel):
	user_id: str
	nombre_usuario: str
	role: Literal["administrador", "empleado"] = "empleado"


class UserCreateRequest(BaseModel):
	nombre_usuario: EmailStr
	password: str = Field(min_length=8, max_length=128)
	rol: Literal["administrador", "empleado"] = "empleado"
	nombre: str = Field(min_length=1, max_length=100)
	apellidos: str = Field(min_length=1, max_length=150)
	nif: str = Field(min_length=5, max_length=20)
	telefono: str | None = Field(default=None, max_length=20)
	fecha_alta: date | None = None


class UserPublic(BaseModel):
	model_config = ConfigDict(extra="allow")

	id: str
	usuario_id: str
	nombre_usuario: EmailStr
	nombre: str
	apellidos: str
	nif: str
	telefono: str | None = None
	rol: Literal["administrador", "empleado"]
	activo: bool = True
	fecha_alta: date | None = None
	fecha_baja: date | None = None
	created_at: datetime | None = None
	updated_at: datetime | None = None


class UserUpdateRequest(BaseModel):
	nombre: str | None = Field(default=None, min_length=1, max_length=100)
	apellidos: str | None = Field(default=None, min_length=1, max_length=150)
	telefono: str | None = Field(default=None, max_length=20)


class UserAdminUpdateRequest(BaseModel):
	rol: Literal["administrador", "empleado"] | None = None
	activo: bool | None = None


class GoogleTokenRequest(BaseModel):
	code: str


class LoginRequest(BaseModel):
	usuario: str = Field(min_length=3, max_length=255)
	password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"
	expires_in: int
	user: dict
