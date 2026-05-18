import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdminChartsResponse,
  AdminCorreccionRequest,
  AdminCorreccionResponse,
  AdminFichajesResponse,
  AdminIaUsageResponse,
  AdminResumenResponse,
  CalendarioFiscalResponse,
  CalendarioFiscalVencimiento,
  CalendarioFiscalVencimientoCreate,
  ClienteCreate,
  ClienteDetailItem,
  ClientesTabResponse,
  ClienteUpdate,
  AuditoriaResponse,
  DeudaVivaPorCliente,
  FacturaCreate,
  FacturaDetailItem,
  FacturaUpdate,
  FichajeRegistroRequest,
  FichajeRegistroResponse,
  FichajeTabResponse,
  FichajeUndoResponse,
  IntranetHomeResponse,
  PagoCreate,
  PagoDetailItem,
  PagosTabResponse,
  QuarterSeriesResponse,
  ResumenMensualResponse,
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

  getResumenMensual(params: { year: number; month: number }): Observable<ResumenMensualResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('year', String(params.year));
    searchParams.set('month', String(params.month));
    return this.http.get<ResumenMensualResponse>(
      `${this.apiUrl}/intranet/resumen/mensual?${searchParams.toString()}`
    );
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

  // ── Pagos tab ─────────────────────────────────────────────────────────────

  getPagosTab(params: {
    page_facturas?: number;
    page_size_facturas?: number;
    page_pagos?: number;
    page_size_pagos?: number;
    estado_factura?: string;
    cliente_id?: string;
    vencidas_solo?: boolean;
    fecha_pago_desde?: string;
    fecha_pago_hasta?: string;
  } = {}): Observable<PagosTabResponse> {
    const sp = new URLSearchParams();
    if (params.page_facturas)      sp.set('page_facturas', String(params.page_facturas));
    if (params.page_size_facturas) sp.set('page_size_facturas', String(params.page_size_facturas));
    if (params.page_pagos)         sp.set('page_pagos', String(params.page_pagos));
    if (params.page_size_pagos)    sp.set('page_size_pagos', String(params.page_size_pagos));
    if (params.estado_factura)     sp.set('estado_factura', params.estado_factura);
    if (params.cliente_id)         sp.set('cliente_id', params.cliente_id);
    if (params.vencidas_solo)      sp.set('vencidas_solo', 'true');
    if (params.fecha_pago_desde)   sp.set('fecha_pago_desde', params.fecha_pago_desde);
    if (params.fecha_pago_hasta)   sp.set('fecha_pago_hasta', params.fecha_pago_hasta);
    const q = sp.toString();
    return this.http.get<PagosTabResponse>(
      `${this.apiUrl}/intranet/pagos${q ? '?' + q : ''}`
    );
  }

  // ── Facturas CRUD ─────────────────────────────────────────────────────────

  getFacturaDetail(facturaId: string): Observable<FacturaDetailItem> {
    return this.http.get<FacturaDetailItem>(`${this.apiUrl}/intranet/facturas/${facturaId}`);
  }

  createFactura(payload: FacturaCreate): Observable<FacturaDetailItem> {
    return this.http.post<FacturaDetailItem>(`${this.apiUrl}/intranet/facturas`, payload);
  }

  updateFactura(facturaId: string, payload: FacturaUpdate): Observable<FacturaDetailItem> {
    return this.http.put<FacturaDetailItem>(`${this.apiUrl}/intranet/facturas/${facturaId}`, payload);
  }

  deleteFactura(facturaId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/intranet/facturas/${facturaId}`);
  }

  // ── Pagos sobre factura ───────────────────────────────────────────────────

  createPago(facturaId: string, payload: PagoCreate): Observable<PagoDetailItem> {
    return this.http.post<PagoDetailItem>(
      `${this.apiUrl}/intranet/facturas/${facturaId}/pagos`,
      payload
    );
  }

  // ── Deuda viva ────────────────────────────────────────────────────────────

  getDeudaViva(): Observable<DeudaVivaPorCliente[]> {
    return this.http.get<DeudaVivaPorCliente[]>(`${this.apiUrl}/intranet/deuda`);
  }

  // ── Calendario fiscal ────────────────────────────────────────────────────

  getCalendarioFiscal(params: { year?: number; month?: number } = {}): Observable<CalendarioFiscalResponse> {
    const sp = new URLSearchParams();
    if (params.year) sp.set('year', String(params.year));
    if (params.month) sp.set('month', String(params.month));
    const q = sp.toString();
    return this.http.get<CalendarioFiscalResponse>(
      `${this.apiUrl}/intranet/calendario-fiscal${q ? '?' + q : ''}`
    );
  }

  exportCalendarioFiscalICS(year: number, month: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/intranet/calendario-fiscal/export/ics?year=${year}&month=${month}`,
      { responseType: 'blob' },
    );
  }

  createCalendarioFiscalVencimiento(payload: CalendarioFiscalVencimientoCreate): Observable<CalendarioFiscalVencimiento> {
    return this.http.post<CalendarioFiscalVencimiento>(`${this.apiUrl}/intranet/calendario-fiscal`, payload);
  }

  updateCalendarioFiscalEstado(
    id: string,
    estado: CalendarioFiscalVencimiento['estado'],
  ): Observable<CalendarioFiscalVencimiento> {
    return this.http.patch<CalendarioFiscalVencimiento>(
      `${this.apiUrl}/intranet/calendario-fiscal/${id}/estado`,
      { estado },
    );
  }

  // ── Auditoría ──────────────────────────────────────────────

  getAuditoria(params: {
    page?: number;
    page_size?: number;
    entidad?: string;
    actor_id?: string;
    accion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  } = {}): Observable<AuditoriaResponse> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', params.page);
    if (params.page_size) p = p.set('page_size', params.page_size);
    if (params.entidad) p = p.set('entidad', params.entidad);
    if (params.actor_id) p = p.set('actor_id', params.actor_id);
    if (params.accion) p = p.set('accion', params.accion);
    if (params.fecha_desde) p = p.set('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) p = p.set('fecha_hasta', params.fecha_hasta);
    return this.http.get<AuditoriaResponse>(`${this.apiUrl}/intranet/admin/auditoria`, { params: p });
  }

  // ── M8: Exports ────────────────────────────────────────────

  exportFacturasCSV(params: { estado_factura?: string; cliente_id?: string; vencidas_solo?: boolean } = {}): string {
    const url = new URL(`${this.apiUrl}/intranet/facturas/export/csv`);
    if (params.estado_factura) url.searchParams.set('estado_factura', params.estado_factura);
    if (params.cliente_id) url.searchParams.set('cliente_id', params.cliente_id);
    if (params.vencidas_solo) url.searchParams.set('vencidas_solo', 'true');
    return url.toString();
  }

  exportCierrePDF(year: number, month: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/intranet/admin/cierre/pdf?year=${year}&month=${month}`,
      { responseType: 'blob' },
    );
  }

  getAdminIaUsage(days = 30): Observable<AdminIaUsageResponse> {
    return this.http.get<AdminIaUsageResponse>(`${this.apiUrl}/intranet/admin/ia/usage?days=${days}`);
  }
}
