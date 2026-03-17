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
	dni: str = Field(min_length=9, max_length=9)
	password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"
	expires_in: int
	user: dict


class FeatureCard(BaseModel):
	clave: str
	titulo: str
	descripcion: str
	ruta: str


class FichajeResumen(BaseModel):
	eventos_hoy: int
	ultimo_evento_tipo: str | None = None
	ultimo_evento_fecha_hora: datetime | None = None
	turno_activo: bool


class ClientesResumen(BaseModel):
	total: int
	activos: int


class TrabajosResumen(BaseModel):
	total: int
	pendientes: int
	en_curso: int
	bloqueados: int
	finalizados: int
	cancelados: int


class PagosResumen(BaseModel):
	cobrado_mes: float
	pendiente_total: float
	facturas_vencidas: int


class PortalIntranetHomeResponse(BaseModel):
	usuario: dict
	funcionalidades: list[FeatureCard]
	fichaje: FichajeResumen
	clientes: ClientesResumen
	trabajos: TrabajosResumen
	pagos: PagosResumen


class FichajeEventoItem(BaseModel):
	id: str
	tipo_evento: str
	fecha_hora: datetime
	origen: str
	observaciones: str | None = None


class PaginacionMeta(BaseModel):
	page: int
	page_size: int
	total: int
	total_pages: int


class FichajeTabResponse(BaseModel):
	usuario: dict
	resumen: FichajeResumen
	eventos_recientes: list[FichajeEventoItem]
	paginacion: PaginacionMeta


class ClienteTabItem(BaseModel):
	cliente_id: str
	nombre_fiscal: str
	cif_nif: str
	activo: bool
	trabajos_abiertos: int
	pendiente_total: float


class ClientesTabResponse(BaseModel):
	usuario: dict
	resumen: ClientesResumen
	clientes: list[ClienteTabItem]


class TrabajoTabItem(BaseModel):
	trabajo_id: str
	titulo: str
	estado: str
	prioridad: str
	cliente_id: str
	cliente_nombre: str
	fecha_inicio: date | None = None
	fecha_objetivo: date | None = None
	fecha_cierre: date | None = None


class TrabajosTabResponse(BaseModel):
	usuario: dict
	resumen: TrabajosResumen
	trabajos: list[TrabajoTabItem]
	paginacion: PaginacionMeta


class FacturaPagoTabItem(BaseModel):
	factura_id: str
	numero: str
	cliente_id: str
	cliente_nombre: str
	estado: str
	fecha_emision: date
	fecha_vencimiento: date | None = None
	total: float
	pagado: float
	pendiente: float


class PagoRecienteTabItem(BaseModel):
	pago_id: str
	factura_id: str
	factura_numero: str
	cliente_nombre: str
	fecha_pago: date
	importe: float
	metodo_pago: str


class PagosTabResponse(BaseModel):
	usuario: dict
	resumen: PagosResumen
	facturas: list[FacturaPagoTabItem]
	pagos_recientes: list[PagoRecienteTabItem]
	paginacion_facturas: PaginacionMeta
	paginacion_pagos: PaginacionMeta
