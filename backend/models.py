from datetime import date, datetime
from typing import Literal
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


_NIF_CIF_RE = re.compile(
    r'^[0-9]{8}[A-Za-z]$'       # DNI/NIF  e.g. 12345678A
    r'|^[XYZxyz][0-9]{7}[A-Za-z]$'  # NIE  e.g. X1234567A
    r'|^[ABCDEFGHJNPQRSUVWabcdefghjnpqrsuvw][0-9]{7}[0-9A-Ja-j]$'  # CIF
)


def _validate_nif_cif(value: str) -> str:
    v = value.strip().upper()
    if not _NIF_CIF_RE.match(v):
        raise ValueError(
            "Formato de NIF/CIF inválido. "
            "Debe ser un DNI (12345678A), NIE (X1234567A) o CIF (B12345678)."
        )
    return v


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

	@field_validator("nif")
	@classmethod
	def validate_nif(cls, v: str) -> str:
		return _validate_nif_cif(v)


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
	mfa_habilitado: bool | None = None


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


class LoginResponse(BaseModel):
	"""Respuesta unificada del endpoint /auth/login.

	Si requires_2fa=True, devuelve session_id y el cliente debe llamar a /auth/otp/verify.
	Si requires_2fa=False, devuelve el token JWT completo directamente.
	"""

	requires_2fa: bool = False
	session_id: str | None = None
	access_token: str | None = None
	token_type: str = "bearer"
	expires_in: int | None = None
	user: dict | None = None


class OtpVerifyRequest(BaseModel):
	session_id: str
	code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


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
	facturado_mes: float = 0
	facturas_emitidas_mes: int = 0
	pendiente_total: float
	pendiente_count: int = 0
	facturas_vencidas: int
	vencido_total: float = 0


class PortalIntranetHomeResponse(BaseModel):
	usuario: dict
	funcionalidades: list[FeatureCard]
	fichaje: FichajeResumen
	clientes: ClientesResumen
	trabajos: TrabajosResumen
	pagos: PagosResumen


class SeriesPoint(BaseModel):
	label: str
	value: float


class QuarterSeriesResponse(BaseModel):
	start: date
	end: date
	granularity: str
	points: list[SeriesPoint]


class FichajeEventoItem(BaseModel):
	id: str
	tipo_evento: str
	fecha_hora: datetime
	origen: str
	observaciones: str | None = None


class FichajeRegistroRequest(BaseModel):
	tipo_evento: Literal["entrada", "salida", "pausa_inicio", "pausa_fin"] | None = None
	observaciones: str | None = None


class FichajeRegistroResponse(BaseModel):
	evento: FichajeEventoItem
	resumen: FichajeResumen


class FichajeUndoResponse(BaseModel):
	evento: FichajeEventoItem
	resumen: FichajeResumen


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
	email: str | None = None
	telefono: str | None = None
	activo: bool
	tipo_cliente: str = 'Sociedad'
	referencia: str = ''
	trabajos_abiertos: int
	facturacion_anio: float = 0.0
	pendiente_total: float
	ultima_actividad: str | None = None


class ClientesTabResponse(BaseModel):
	usuario: dict
	resumen: ClientesResumen
	clientes: list[ClienteTabItem]
	total: int
	page: int
	page_size: int


class ClienteCreate(BaseModel):
	nombre_fiscal: str = Field(..., min_length=2, max_length=255)
	cif_nif: str = Field(..., min_length=9, max_length=20)
	email: EmailStr | None = None
	telefono: str | None = Field(default=None, max_length=20)
	direccion: str | None = None
	codigo_postal: str | None = Field(default=None, max_length=10)
	ciudad: str | None = Field(default=None, max_length=100)
	provincia: str | None = Field(default=None, max_length=100)
	tipo_cliente: Literal['Sociedad', 'Autónomo', 'SCP', 'CB'] = 'Sociedad'

	@field_validator("cif_nif")
	@classmethod
	def validate_cif_nif(cls, v: str) -> str:
		return _validate_nif_cif(v)


class ClienteUpdate(BaseModel):
	nombre_fiscal: str | None = Field(default=None, min_length=2, max_length=255)
	cif_nif: str | None = Field(default=None, min_length=9, max_length=20)
	email: EmailStr | None = None
	telefono: str | None = Field(default=None, max_length=20)
	direccion: str | None = None
	codigo_postal: str | None = Field(default=None, max_length=10)
	ciudad: str | None = Field(default=None, max_length=100)
	provincia: str | None = Field(default=None, max_length=100)
	tipo_cliente: Literal['Sociedad', 'Autónomo', 'SCP', 'CB'] | None = None

	@field_validator("cif_nif", mode="before")
	@classmethod
	def validate_cif_nif_optional(cls, v: str | None) -> str | None:
		if v is None:
			return v
		return _validate_nif_cif(v)


class ClienteDetailItem(BaseModel):
	cliente_id: str
	nombre_fiscal: str
	cif_nif: str
	email: str | None
	telefono: str | None
	direccion: str | None
	codigo_postal: str | None
	ciudad: str | None
	provincia: str | None
	activo: bool
	tipo_cliente: str
	referencia: str
	created_at: datetime
	trabajos_count: int
	trabajos_abiertos: int
	facturas_count: int
	facturacion_anio: float
	pendiente_total: float


class TrabajoEmpleadoAsignado(BaseModel):
	empleado_id: str
	nombre_completo: str


class TrabajoTabItem(BaseModel):
	trabajo_id: str
	nro_trabajo: int
	titulo: str
	estado: str
	prioridad: str
	cliente_id: str
	cliente_nombre: str
	nro_cliente: int | None = None
	fecha_inicio: date | None = None
	fecha_objetivo: date | None = None
	fecha_cierre: date | None = None
	nota_bloqueo: str | None = None
	empleados_asignados: list[TrabajoEmpleadoAsignado] = []


class TrabajosTabResponse(BaseModel):
	usuario: dict
	resumen: TrabajosResumen
	trabajos: list[TrabajoTabItem]
	paginacion: PaginacionMeta


ESTADOS_TRABAJO_VALIDOS = {'pendiente', 'en_curso', 'bloqueado', 'finalizado', 'cancelado'}
PRIORIDADES_TRABAJO_VALIDAS = {'baja', 'media', 'alta', 'urgente', 'no_aplica'}


class TrabajoCreate(BaseModel):
	titulo: str = Field(..., min_length=2, max_length=255)
	cliente_id: str
	descripcion: str | None = None
	prioridad: str = Field(default='media')
	fecha_inicio: date | None = None
	fecha_objetivo: date | None = None
	nota_bloqueo: str | None = Field(default=None, max_length=500)

	model_config = ConfigDict(str_strip_whitespace=True)

	@field_validator('prioridad')
	@classmethod
	def validate_prioridad(cls, v: str) -> str:
		if v not in PRIORIDADES_TRABAJO_VALIDAS:
			raise ValueError(f'Prioridad inválida. Valores permitidos: {PRIORIDADES_TRABAJO_VALIDAS}')
		return v



class TrabajoUpdate(BaseModel):
	titulo: str | None = Field(default=None, min_length=2, max_length=255)
	descripcion: str | None = None
	estado: str | None = None
	prioridad: str | None = None
	fecha_inicio: date | None = None
	fecha_objetivo: date | None = None
	fecha_cierre: date | None = None
	nota_bloqueo: str | None = Field(default=None, max_length=500)

	model_config = ConfigDict(str_strip_whitespace=True)

	@field_validator('estado')
	@classmethod
	def validate_estado(cls, v: str | None) -> str | None:
		if v is not None and v not in ESTADOS_TRABAJO_VALIDOS:
			raise ValueError(f'Estado inválido. Valores permitidos: {ESTADOS_TRABAJO_VALIDOS}')
		return v

	@field_validator('prioridad')
	@classmethod
	def validate_prioridad(cls, v: str | None) -> str | None:
		if v is not None and v not in PRIORIDADES_TRABAJO_VALIDAS:
			raise ValueError(f'Prioridad inválida. Valores permitidos: {PRIORIDADES_TRABAJO_VALIDAS}')
		return v


class TrabajoDetailItem(BaseModel):
	trabajo_id: str
	nro_trabajo: int
	titulo: str
	descripcion: str | None
	estado: str
	prioridad: str
	cliente_id: str
	cliente_nombre: str
	nro_cliente: int | None = None
	fecha_inicio: date | None
	fecha_objetivo: date | None
	fecha_cierre: date | None
	nota_bloqueo: str | None
	creado_por_nombre: str
	created_at: datetime
	empleados_asignados: list[TrabajoEmpleadoAsignado] = []


class TrabajoEmpleadoRequest(BaseModel):
	empleado_id: str


class TrabajoComentarioCreate(BaseModel):
	texto: str = Field(..., min_length=1, max_length=1000)


class TrabajoComentarioItem(BaseModel):
	comentario_id: str
	trabajo_id: str
	autor_id: str
	autor_nombre: str
	texto: str
	created_at: datetime


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


class AdminEmpleadoResumen(BaseModel):
	empleado_id: str
	usuario_id: str = ""
	nombre_completo: str
	rol: str
	activo: bool
	mfa_habilitado: bool = False
	horas_mes: float
	turno_activo: bool
	trabajos_en_curso: int
	trabajos_pendientes: int
	trabajos_bloqueados: int


class AdminTrabajosGlobal(BaseModel):
	total: int
	en_curso: int
	pendientes: int
	bloqueados: int
	finalizados: int
	cancelados: int


class AdminFacturacionGlobal(BaseModel):
	facturas_vencidas: int
	cobrado_total: float
	pendiente_total: float
	clientes_con_facturas: int


class AdminClientesGlobal(BaseModel):
	total: int
	activos: int


class AdminResumenResponse(BaseModel):
	empleados: list[AdminEmpleadoResumen]
	trabajos: AdminTrabajosGlobal
	facturacion: AdminFacturacionGlobal
	clientes: AdminClientesGlobal


class AdminChartPoint(BaseModel):
	mes: str        # YYYY-MM
	label: str      # e.g. "Abr 2026"


class FacturacionMensualPoint(AdminChartPoint):
	facturado_total: float
	cobrado_total: float
	facturas_emitidas: int
	facturas_vencidas: int


class TrabajosMensualesPoint(AdminChartPoint):
	trabajos_creados: int
	finalizados: int
	cancelados: int
	bloqueados: int


class ClientesMensualesPoint(AdminChartPoint):
	clientes_nuevos: int


class HorasMensualesPoint(AdminChartPoint):
	horas_totales: float


class AdminChartsResponse(BaseModel):
	facturacion: list[FacturacionMensualPoint]
	cobros: list[FacturacionMensualPoint]
	trabajos: list[TrabajosMensualesPoint]
	clientes: list[ClientesMensualesPoint]
	horas: list[HorasMensualesPoint]


class AdminFichajeItem(BaseModel):
	fichaje_id: str
	empleado_id: str
	nombre_completo: str
	tipo_evento: str
	fecha_hora: datetime
	origen: str
	observaciones: str | None = None


class AdminFichajesEmpleadoOption(BaseModel):
	empleado_id: str
	nombre_completo: str


class AdminFichajesResponse(BaseModel):
	fichajes: list[AdminFichajeItem]
	empleados: list[AdminFichajesEmpleadoOption]
	paginacion: PaginacionMeta


class AdminCorreccionRequest(BaseModel):
	empleado_id: str
	tipo_evento: Literal['entrada', 'salida', 'pausa_inicio', 'pausa_fin']
	fecha_hora: datetime
	observaciones: str | None = None


class AdminCorreccionResponse(BaseModel):
	fichaje_id: str
	empleado_id: str
	nombre_completo: str
	tipo_evento: str
	fecha_hora: datetime
	origen: str
	observaciones: str | None = None


# ── Facturas / Pagos (escritura) ──────────────────────────────────────────────

ESTADOS_FACTURA_VALIDOS = {'borrador', 'emitida', 'pagada_parcial', 'pagada', 'anulada'}
METODOS_PAGO_VALIDOS = {'transferencia', 'efectivo', 'tarjeta', 'domiciliacion', 'otro'}


class FacturaCreate(BaseModel):
	cliente_id: str
	concepto: str = Field(..., min_length=2, max_length=1000)
	base_imponible: float = Field(..., gt=0)
	porcentaje_iva: float = Field(default=21.0, ge=0, le=100)
	fecha_emision: date | None = None
	fecha_vencimiento: date | None = None
	notas: str | None = None

	model_config = ConfigDict(str_strip_whitespace=True)


class FacturaUpdate(BaseModel):
	concepto: str | None = Field(default=None, min_length=2, max_length=1000)
	base_imponible: float | None = Field(default=None, gt=0)
	porcentaje_iva: float | None = Field(default=None, ge=0, le=100)
	fecha_emision: date | None = None
	fecha_vencimiento: date | None = None
	estado: str | None = None
	notas: str | None = None

	model_config = ConfigDict(str_strip_whitespace=True)

	@field_validator('estado')
	@classmethod
	def validate_estado(cls, v: str | None) -> str | None:
		if v is not None and v not in ESTADOS_FACTURA_VALIDOS:
			raise ValueError(f'Estado inválido. Valores permitidos: {ESTADOS_FACTURA_VALIDOS}')
		return v


class FacturaDetailItem(BaseModel):
	factura_id: str
	numero: str
	cliente_id: str
	cliente_nombre: str
	estado: str
	concepto: str | None
	notas: str | None
	base_imponible: float
	porcentaje_iva: float
	importe_iva: float
	total: float
	pagado: float
	pendiente: float
	fecha_emision: date
	fecha_vencimiento: date | None = None
	created_at: datetime
	pagos: list[dict] = []


class PagoCreate(BaseModel):
	importe: float = Field(..., gt=0)
	metodo_pago: str = Field(default='transferencia')
	fecha_pago: date | None = None
	referencia: str | None = Field(default=None, max_length=100)
	notas: str | None = None

	model_config = ConfigDict(str_strip_whitespace=True)

	@field_validator('metodo_pago')
	@classmethod
	def validate_metodo(cls, v: str) -> str:
		if v not in METODOS_PAGO_VALIDOS:
			raise ValueError(f'Método de pago inválido. Valores permitidos: {METODOS_PAGO_VALIDOS}')
		return v


class PagoDetailItem(BaseModel):
	pago_id: str
	factura_id: str
	factura_numero: str
	cliente_nombre: str
	fecha_pago: date
	importe: float
	metodo_pago: str
	referencia: str | None
	notas: str | None


class DeudaVivaPorClienteItem(BaseModel):
	cliente_id: str
	nombre_fiscal: str
	cif_nif: str
	activo: bool
	total_facturas: int
	total_facturado: float
	total_cobrado: float
	deuda_pendiente: float
	facturas_vencidas: int

