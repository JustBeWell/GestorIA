import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdminChartsResponse,
  AdminCorreccionRequest,
  AdminCorreccionResponse,
  AdminFichajesResponse,
  AdminResumenResponse,
  ClienteCreate,
  ClienteDetailItem,
  ClientesTabResponse,
  ClienteUpdate,
  FichajeRegistroRequest,
  FichajeRegistroResponse,
  FichajeTabResponse,
  FichajeUndoResponse,
  IntranetHomeResponse,
  QuarterSeriesResponse,
  TrabajoComentario,
  TrabajoCreate,
  TrabajoDetailItem,
  TrabajosTabResponse,
  TrabajoUpdate,
} from '../models/intranet.models';
import { UserCreatePayload, UserAdminUpdatePayload } from '../models/user-admin.models';

@Injectable({ providedIn: 'root' })
export class IntranetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getHome(): Observable<IntranetHomeResponse> {
    return this.http.get<IntranetHomeResponse>(`${this.apiUrl}/intranet/home`);
  }

  getFichajeQuarterSeries(): Observable<QuarterSeriesResponse> {
    return this.http.get<QuarterSeriesResponse>(`${this.apiUrl}/intranet/series/fichaje`);
  }

  getClientesTab(params: { page?: number; page_size?: number } = {}): Observable<ClientesTabResponse> {
    const sp = new URLSearchParams();
    if (params.page)      sp.set('page', String(params.page));
    if (params.page_size) sp.set('page_size', String(params.page_size));
    const q = sp.toString();
    return this.http.get<ClientesTabResponse>(
      `${this.apiUrl}/intranet/clientes${q ? '?' + q : ''}`
    );
  }

  getClientesQuarterSeries(): Observable<QuarterSeriesResponse> {
    return this.http.get<QuarterSeriesResponse>(`${this.apiUrl}/intranet/series/clientes`);
  }

  getTrabajosQuarterSeries(): Observable<QuarterSeriesResponse> {
    return this.http.get<QuarterSeriesResponse>(`${this.apiUrl}/intranet/series/trabajos`);
  }

  getPagosQuarterSeries(): Observable<QuarterSeriesResponse> {
    return this.http.get<QuarterSeriesResponse>(`${this.apiUrl}/intranet/series/pagos`);
  }

  getFichajeTab(params: {
    page?: number;
    page_size?: number;
    tipo_evento?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Observable<FichajeTabResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) {
      searchParams.set('page', String(params.page));
    }
    if (params.page_size) {
      searchParams.set('page_size', String(params.page_size));
    }
    if (params.tipo_evento) {
      searchParams.set('tipo_evento', params.tipo_evento);
    }
    if (params.fecha_desde) {
      searchParams.set('fecha_desde', params.fecha_desde);
    }
    if (params.fecha_hasta) {
      searchParams.set('fecha_hasta', params.fecha_hasta);
    }

    const query = searchParams.toString();
    const url = query
      ? `${this.apiUrl}/intranet/fichaje?${query}`
      : `${this.apiUrl}/intranet/fichaje`;

    return this.http.get<FichajeTabResponse>(url);
  }

  registerFichaje(payload: FichajeRegistroRequest): Observable<FichajeRegistroResponse> {
    return this.http.post<FichajeRegistroResponse>(`${this.apiUrl}/intranet/fichaje/registrar`, payload);
  }

  exportFichaje(params: {
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Observable<Blob> {
    const searchParams = new URLSearchParams();

    if (params.fecha_desde) {
      searchParams.set('fecha_desde', params.fecha_desde);
    }
    if (params.fecha_hasta) {
      searchParams.set('fecha_hasta', params.fecha_hasta);
    }

    const query = searchParams.toString();
    const url = query
      ? `${this.apiUrl}/intranet/fichaje/export?${query}`
      : `${this.apiUrl}/intranet/fichaje/export`;

    return this.http.get(url, { responseType: 'blob' });
  }

  exportFichajePDF(params: {
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Observable<Blob> {
    const searchParams = new URLSearchParams();

    if (params.fecha_desde) {
      searchParams.set('fecha_desde', params.fecha_desde);
    }
    if (params.fecha_hasta) {
      searchParams.set('fecha_hasta', params.fecha_hasta);
    }

    const query = searchParams.toString();
    const url = query
      ? `${this.apiUrl}/intranet/fichaje/export/pdf?${query}`
      : `${this.apiUrl}/intranet/fichaje/export/pdf`;

    return this.http.get(url, { responseType: 'blob' });
  }

  deleteLastFichaje(): Observable<FichajeUndoResponse> {
    return this.http.post<FichajeUndoResponse>(`${this.apiUrl}/intranet/fichaje/ultimo/eliminar`, {});
  }

  getAdminResumen(): Observable<AdminResumenResponse> {
    return this.http.get<AdminResumenResponse>(`${this.apiUrl}/intranet/admin/resumen`);
  }

  getAdminCharts(months = 12): Observable<AdminChartsResponse> {
    return this.http.get<AdminChartsResponse>(`${this.apiUrl}/intranet/admin/charts?months=${months}`);
  }

  getAdminFichajes(params: {
    page?: number;
    page_size?: number;
    empleado_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo_evento?: string;
  }): Observable<AdminFichajesResponse> {
    const sp = new URLSearchParams();
    if (params.page)        sp.set('page', String(params.page));
    if (params.page_size)   sp.set('page_size', String(params.page_size));
    if (params.empleado_id) sp.set('empleado_id', params.empleado_id);
    if (params.fecha_desde) sp.set('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) sp.set('fecha_hasta', params.fecha_hasta);
    if (params.tipo_evento) sp.set('tipo_evento', params.tipo_evento);
    const q = sp.toString();
    return this.http.get<AdminFichajesResponse>(
      `${this.apiUrl}/intranet/admin/fichajes${q ? '?' + q : ''}`
    );
  }

  createEmpleado(payload: UserCreatePayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/users/`, payload);
  }

  adminUpdateEmpleado(userId: string, payload: UserAdminUpdatePayload): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/users/${userId}/admin`, payload);
  }

  createCorreccionFichaje(payload: AdminCorreccionRequest): Observable<AdminCorreccionResponse> {
    return this.http.post<AdminCorreccionResponse>(`${this.apiUrl}/intranet/admin/fichajes/correccion`, payload);
  }

  // ── Clientes CRUD ──────────────────────────────────────────────────────────

  getClienteDetail(clienteId: string): Observable<ClienteDetailItem> {
    return this.http.get<ClienteDetailItem>(`${this.apiUrl}/intranet/clientes/${clienteId}`);
  }

  createCliente(payload: ClienteCreate): Observable<ClienteDetailItem> {
    return this.http.post<ClienteDetailItem>(`${this.apiUrl}/intranet/clientes`, payload);
  }

  updateCliente(clienteId: string, payload: ClienteUpdate): Observable<ClienteDetailItem> {
    return this.http.put<ClienteDetailItem>(`${this.apiUrl}/intranet/clientes/${clienteId}`, payload);
  }

  deleteCliente(clienteId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/intranet/clientes/${clienteId}`);
  }

  // ── Trabajos CRUD ─────────────────────────────────────────────────────────

  getTrabajosTab(params: {
    page?: number;
    page_size?: number;
    estado?: string;
    prioridad?: string;
    cliente_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  } = {}): Observable<TrabajosTabResponse> {
    const sp = new URLSearchParams();
    if (params.page)        sp.set('page', String(params.page));
    if (params.page_size)   sp.set('page_size', String(params.page_size));
    if (params.estado)      sp.set('estado', params.estado);
    if (params.prioridad)   sp.set('prioridad', params.prioridad);
    if (params.cliente_id)  sp.set('cliente_id', params.cliente_id);
    if (params.fecha_desde) sp.set('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) sp.set('fecha_hasta', params.fecha_hasta);
    const q = sp.toString();
    return this.http.get<TrabajosTabResponse>(
      `${this.apiUrl}/intranet/trabajos${q ? '?' + q : ''}`
    );
  }

  getTrabajoDetail(trabajoId: string): Observable<TrabajoDetailItem> {
    return this.http.get<TrabajoDetailItem>(`${this.apiUrl}/intranet/trabajos/${trabajoId}`);
  }

  createTrabajo(payload: TrabajoCreate): Observable<TrabajoDetailItem> {
    return this.http.post<TrabajoDetailItem>(`${this.apiUrl}/intranet/trabajos`, payload);
  }

  updateTrabajo(trabajoId: string, payload: TrabajoUpdate): Observable<TrabajoDetailItem> {
    return this.http.put<TrabajoDetailItem>(`${this.apiUrl}/intranet/trabajos/${trabajoId}`, payload);
  }

  deleteTrabajo(trabajoId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/intranet/trabajos/${trabajoId}`);
  }

  getTrabajoEmpleados(trabajoId: string): Observable<{ empleados: { empleado_id: string; nombre_completo: string }[] }> {
    return this.http.get<{ empleados: { empleado_id: string; nombre_completo: string }[] }>(
      `${this.apiUrl}/intranet/trabajos/${trabajoId}/empleados`
    );
  }

  assignEmpleadoToTrabajo(trabajoId: string, empleadoId: string): Observable<{ empleados: { empleado_id: string; nombre_completo: string }[] }> {
    return this.http.post<{ empleados: { empleado_id: string; nombre_completo: string }[] }>(
      `${this.apiUrl}/intranet/trabajos/${trabajoId}/empleados`,
      { empleado_id: empleadoId }
    );
  }

  unassignEmpleadoFromTrabajo(trabajoId: string, empleadoId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/intranet/trabajos/${trabajoId}/empleados/${empleadoId}`
    );
  }

  getTrabajoComentarios(trabajoId: string): Observable<TrabajoComentario[]> {
    return this.http.get<TrabajoComentario[]>(`${this.apiUrl}/intranet/trabajos/${trabajoId}/comentarios`);
  }

  addTrabajoComentario(trabajoId: string, texto: string): Observable<TrabajoComentario> {
    return this.http.post<TrabajoComentario>(
      `${this.apiUrl}/intranet/trabajos/${trabajoId}/comentarios`,
      { texto }
    );
  }

  // ── Empleados (lista para selectores) ─────────────────────────────────────

  getEmpleadosList(): Observable<{ id: string; nombre: string; apellidos: string; activo: boolean }[]> {
    return this.http.get<{ id: string; nombre: string; apellidos: string; activo: boolean }[]>(`${this.apiUrl}/users/`);
  }
}
