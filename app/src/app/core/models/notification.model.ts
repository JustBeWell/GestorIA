export type NotificationTipo =
  | 'INV_DUE_SOON'
  | 'INV_DUE_TODAY'
  | 'INV_OVERDUE_WEEKLY'
  | 'TASK_DEADLINE_SOON'
  | 'TASK_DEADLINE_TODAY'
  | 'TASK_ASSIGNED'
  | 'TASK_UNASSIGNED'
  | 'TASK_STATE_CHANGED'
  | 'TASK_CANCELLED'
  | 'TASK_COMMENT_NEW'
  | 'TASK_PRIORITY_CHANGED';

export type NotificationPrioridad = 'baja' | 'media' | 'alta' | 'critica';

export interface NotificationItem {
  id: string;
  tipo: NotificationTipo;
  prioridad: NotificationPrioridad;
  titulo: string;
  mensaje: string;
  entidad: string;
  entidad_id: string;
  deep_link: string | null;
  metadata: Record<string, unknown>;
  leida: boolean;
  archivada: boolean;
  created_at: string;
}

export interface NotificationsListResponse {
  notificaciones: NotificationItem[];
  no_leidas: number;
  paginacion: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface NotificationsQuery {
  page?: number;
  page_size?: number;
  solo_no_leidas?: boolean;
  tipo?: string;
  desde?: string;
  hasta?: string;
  archivadas?: boolean;
}

export interface NotificationsCounterResponse {
  no_leidas: number;
  criticas: number;
}

export interface NotificationPreferenceItem {
  tipo: NotificationTipo;
  canal_in_app: boolean;
  canal_web_push: boolean;
  canal_email: boolean;
  silencio_desde: string | null;
  silencio_hasta: string | null;
}

export type NotificationPreferenceUpdate = Partial<
  Pick<NotificationPreferenceItem, 'canal_in_app' | 'canal_web_push' | 'canal_email' | 'silencio_desde' | 'silencio_hasta'>
>;

export interface PushSubscriptionItem {
  id: string;
  endpoint: string;
  user_agent: string | null;
  plataforma: 'web' | 'electron';
  activo: boolean;
  last_seen_at: string;
  created_at: string;
}
