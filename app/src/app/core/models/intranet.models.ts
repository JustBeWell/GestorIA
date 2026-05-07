export interface IntranetUsuarioResumen {
  usuario_id: string;
  empleado_id: string;
  nombre_usuario: string;
  nombre_completo: string;
  rol: string;
}

export interface IntranetFeatureCard {
  clave: string;
  titulo: string;
  descripcion: string;
  ruta: string;
}

export interface FichajeResumen {
  eventos_hoy: number;
  ultimo_evento_tipo: string | null;
  ultimo_evento_fecha_hora: string | null;
  turno_activo: boolean;
}

export interface ClientesResumen {
  total: number;
  activos: number;
}

export interface TrabajosResumen {
  total: number;
  pendientes: number;
  en_curso: number;
  bloqueados: number;
  finalizados: number;
  cancelados: number;
}

export interface PagosResumen {
  cobrado_mes: number;
  facturado_mes: number;
  facturas_emitidas_mes: number;
  pendiente_total: number;
  pendiente_count: number;
  facturas_vencidas: number;
  vencido_total: number;
}

export interface QuarterSeriesPoint {
  label: string;
  value: number;
}

export interface QuarterSeriesResponse {
  start: string;
  end: string;
  granularity: string;
  points: QuarterSeriesPoint[];
}

export interface IntranetHomeResponse {
  usuario: IntranetUsuarioResumen;
  funcionalidades: IntranetFeatureCard[];
  fichaje: FichajeResumen;
  clientes: ClientesResumen;
  trabajos: TrabajosResumen;
  pagos: PagosResumen;
}

export interface FichajeEventoItem {
  id: string;
  tipo_evento: string;
  fecha_hora: string;
  origen: string;
  observaciones: string | null;
}

export interface FichajeRegistroRequest {
  tipo_evento?: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin';
  observaciones?: string | null;
}

export interface FichajeRegistroResponse {
  evento: FichajeEventoItem;
  resumen: FichajeResumen;
}

export interface FichajeUndoResponse {
  evento: FichajeEventoItem;
  resumen: FichajeResumen;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface FichajeTabResponse {
  usuario: IntranetUsuarioResumen;
  resumen: FichajeResumen;
  eventos_recientes: FichajeEventoItem[];
  paginacion: PaginationMeta;
}

export interface AdminEmpleadoResumen {
  empleado_id: string;
  usuario_id: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  mfa_habilitado: boolean;
  horas_mes: number;
  turno_activo: boolean;
  trabajos_en_curso: number;
  trabajos_pendientes: number;
  trabajos_bloqueados: number;
}

export interface AdminResumenResponse {
  empleados: AdminEmpleadoResumen[];
  trabajos: {
    total: number;
    en_curso: number;
    pendientes: number;
    bloqueados: number;
    finalizados: number;
    cancelados: number;
  };
  facturacion: {
    facturas_vencidas: number;
    cobrado_total: number;
    pendiente_total: number;
    clientes_con_facturas: number;
  };
  clientes: {
    total: number;
    activos: number;
  };
}

export interface AdminChartPointBase {
  mes: string;
  label: string;
}

export interface FacturacionMensualPoint extends AdminChartPointBase {
  facturado_total: number;
  cobrado_total: number;
  facturas_emitidas: number;
  facturas_vencidas: number;
}

export interface TrabajosMensualesPoint extends AdminChartPointBase {
  trabajos_creados: number;
  finalizados: number;
  cancelados: number;
  bloqueados: number;
}

export interface ClientesMensualesPoint extends AdminChartPointBase {
  clientes_nuevos: number;
}

export interface HorasMensualesPoint extends AdminChartPointBase {
  horas_totales: number;
}

export interface AdminChartsResponse {
  facturacion: FacturacionMensualPoint[];
  cobros: FacturacionMensualPoint[];
  trabajos: TrabajosMensualesPoint[];
  clientes: ClientesMensualesPoint[];
  horas: HorasMensualesPoint[];
}

export interface AdminFichajeItem {
  fichaje_id: string;
  empleado_id: string;
  nombre_completo: string;
  tipo_evento: string;
  fecha_hora: string;
  origen: string;
  observaciones: string | null;
}

export interface AdminFichajesEmpleadoOption {
  empleado_id: string;
  nombre_completo: string;
}

export interface AdminFichajesResponse {
  fichajes: AdminFichajeItem[];
  empleados: AdminFichajesEmpleadoOption[];
  paginacion: PaginationMeta;
}

export interface AdminCorreccionRequest {
  empleado_id: string;
  tipo_evento: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin';
  fecha_hora: string; // ISO 8601 datetime
  observaciones?: string | null;
}

export interface AdminCorreccionResponse {
  fichaje_id: string;
  empleado_id: string;
  nombre_completo: string;
  tipo_evento: string;
  fecha_hora: string;
  origen: string;
  observaciones: string | null;
}

export interface ClienteTabItem {
  cliente_id: string;
  nombre_fiscal: string;
  cif_nif: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  tipo_cliente: string;
  referencia: string;
  trabajos_abiertos: number;
  facturacion_anio: number;
  pendiente_total: number;
  ultima_actividad: string | null;
}

export interface ClientesTabResponse {
  usuario: IntranetUsuarioResumen;
  resumen: ClientesResumen;
  clientes: ClienteTabItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ClienteDetailItem {
  cliente_id: string;
  nombre_fiscal: string;
  cif_nif: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string | null;
  activo: boolean;
  tipo_cliente: string;
  referencia: string;
  created_at: string;
  trabajos_count: number;
  trabajos_abiertos: number;
  facturas_count: number;
  facturacion_anio: number;
  pendiente_total: number;
}

export type TipoCliente = 'Sociedad' | 'Autónomo' | 'SCP' | 'CB';

export interface ClienteCreate {
  nombre_fiscal: string;
  cif_nif: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  codigo_postal?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  tipo_cliente?: TipoCliente;
}

export type ClienteUpdate = Partial<ClienteCreate>;

// ── Trabajos ─────────────────────────────────────────────────────────────────

export type EstadoTrabajo = 'pendiente' | 'en_curso' | 'bloqueado' | 'finalizado' | 'cancelado';
export type PrioridadTrabajo = 'baja' | 'media' | 'alta' | 'urgente' | 'no_aplica';

export interface TrabajoEmpleadoAsignado {
  empleado_id: string;
  nombre_completo: string;
}

export interface TrabajoTabItem {
  trabajo_id: string;
  nro_trabajo: number;
  titulo: string;
  estado: EstadoTrabajo;
  prioridad: PrioridadTrabajo;
  cliente_id: string;
  cliente_nombre: string;
  nro_cliente: number | null;
  fecha_inicio: string | null;
  fecha_objetivo: string | null;
  fecha_cierre: string | null;
  nota_bloqueo: string | null;
  empleados_asignados: TrabajoEmpleadoAsignado[];
}

export interface TrabajosTabResponse {
  usuario: IntranetUsuarioResumen;
  resumen: TrabajosResumen;
  trabajos: TrabajoTabItem[];
  paginacion: PaginationMeta;
}

export interface TrabajoDetailItem {
  trabajo_id: string;
  nro_trabajo: number;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTrabajo;
  prioridad: PrioridadTrabajo;
  cliente_id: string;
  cliente_nombre: string;
  nro_cliente: number | null;
  fecha_inicio: string | null;
  fecha_objetivo: string | null;
  fecha_cierre: string | null;
  nota_bloqueo: string | null;
  creado_por_nombre: string;
  created_at: string;
  empleados_asignados: TrabajoEmpleadoAsignado[];
}

export interface TrabajoCreate {
  titulo: string;
  cliente_id: string;
  descripcion?: string | null;
  prioridad?: PrioridadTrabajo;
  fecha_inicio?: string | null;
  fecha_objetivo?: string | null;
  nota_bloqueo?: string | null;
}

export interface TrabajoUpdate {
  titulo?: string;
  descripcion?: string | null;
  estado?: EstadoTrabajo;
  prioridad?: PrioridadTrabajo;
  fecha_inicio?: string | null;
  fecha_objetivo?: string | null;
  fecha_cierre?: string | null;
  nota_bloqueo?: string | null;
}

export interface TrabajoComentario {
  comentario_id: string;
  trabajo_id: string;
  autor_id: string;
  autor_nombre: string;
  texto: string;
  created_at: string;
}

// ── Pagos / Facturas ──────────────────────────────────────────────────────────

export type EstadoFactura = 'borrador' | 'emitida' | 'pagada_parcial' | 'pagada' | 'anulada';
export type MetodoPago = 'transferencia' | 'efectivo' | 'tarjeta' | 'domiciliacion' | 'otro';

export interface FacturaPagoTabItem {
  factura_id: string;
  numero: string;
  cliente_id: string;
  cliente_nombre: string;
  estado: EstadoFactura;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  total: number;
  pagado: number;
  pendiente: number;
}

export interface PagoRecienteTabItem {
  pago_id: string;
  factura_id: string;
  factura_numero: string;
  cliente_nombre: string;
  fecha_pago: string;
  importe: number;
  metodo_pago: MetodoPago;
}

export interface PagosTabResponse {
  usuario: IntranetUsuarioResumen;
  resumen: PagosResumen;
  facturas: FacturaPagoTabItem[];
  pagos_recientes: PagoRecienteTabItem[];
  paginacion_facturas: PaginationMeta;
  paginacion_pagos: PaginationMeta;
}

export interface PagoEnFactura {
  pago_id: string;
  fecha_pago: string;
  importe: number;
  metodo_pago: MetodoPago;
  referencia: string | null;
  notas: string | null;
}

export interface FacturaDetailItem {
  factura_id: string;
  numero: string;
  cliente_id: string;
  cliente_nombre: string;
  estado: EstadoFactura;
  concepto: string | null;
  notas: string | null;
  base_imponible: number;
  porcentaje_iva: number;
  importe_iva: number;
  total: number;
  pagado: number;
  pendiente: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  created_at: string;
  pagos: PagoEnFactura[];
}

export interface FacturaCreate {
  cliente_id: string;
  concepto: string;
  base_imponible: number;
  porcentaje_iva?: number;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  notas?: string | null;
}

export interface FacturaUpdate {
  concepto?: string;
  base_imponible?: number;
  porcentaje_iva?: number;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  estado?: EstadoFactura;
  notas?: string | null;
}

export interface PagoCreate {
  importe: number;
  metodo_pago?: MetodoPago;
  fecha_pago?: string | null;
  referencia?: string | null;
  notas?: string | null;
}

export interface PagoDetailItem {
  pago_id: string;
  factura_id: string;
  factura_numero: string;
  cliente_nombre: string;
  fecha_pago: string;
  importe: number;
  metodo_pago: MetodoPago;
  referencia: string | null;
  notas: string | null;
}

export interface DeudaVivaPorCliente {
  cliente_id: string;
  nombre_fiscal: string;
  cif_nif: string;
  activo: boolean;
  total_facturas: number;
  total_facturado: number;
  total_cobrado: number;
  deuda_pendiente: number;
  facturas_vencidas: number;
}

