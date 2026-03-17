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
