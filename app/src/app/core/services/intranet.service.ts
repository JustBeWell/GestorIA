import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FichajeTabResponse, IntranetHomeResponse } from '../models/intranet.models';

@Injectable({ providedIn: 'root' })
export class IntranetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getHome(): Observable<IntranetHomeResponse> {
    return this.http.get<IntranetHomeResponse>(`${this.apiUrl}/intranet/home`);
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
}
