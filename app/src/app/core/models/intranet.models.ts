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
  pendiente_total: number;
  facturas_vencidas: number;
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
