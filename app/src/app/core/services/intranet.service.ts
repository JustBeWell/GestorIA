import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdminChartsResponse,
  AdminResumenResponse,
  FichajeRegistroRequest,
  FichajeRegistroResponse,
  FichajeTabResponse,
  FichajeUndoResponse,
  IntranetHomeResponse,
  QuarterSeriesResponse,
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

  deleteLastFichaje(): Observable<FichajeUndoResponse> {
    return this.http.post<FichajeUndoResponse>(`${this.apiUrl}/intranet/fichaje/ultimo/eliminar`, {});
  }

  getAdminResumen(): Observable<AdminResumenResponse> {
    return this.http.get<AdminResumenResponse>(`${this.apiUrl}/intranet/admin/resumen`);
  }

  getAdminCharts(months = 12): Observable<AdminChartsResponse> {
    return this.http.get<AdminChartsResponse>(`${this.apiUrl}/intranet/admin/charts?months=${months}`);
  }

  createEmpleado(payload: UserCreatePayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/users/`, payload);
  }

  adminUpdateEmpleado(userId: string, payload: UserAdminUpdatePayload): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/users/${userId}/admin`, payload);
  }
}
