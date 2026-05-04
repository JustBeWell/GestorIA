import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { IntranetService } from './intranet.service';
import { environment } from '../../../environments/environment';
import { ClientesTabResponse } from '../models/intranet.models';

const BASE = environment.apiUrl;

const CLIENTES_RESPONSE: ClientesTabResponse = {
  usuario: {
    usuario_id: 'u1',
    empleado_id: 'e1',
    nombre_usuario: 'test@gestoria.local',
    nombre_completo: 'Test User',
    rol: 'empleado',
  },
  resumen: { total: 2, activos: 2 },
  clientes: [],
  total: 2,
  page: 1,
  page_size: 20,
};

describe('IntranetService — getClientesTab', () => {
  let service: IntranetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), IntranetService],
    });
    service = TestBed.inject(IntranetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should request /intranet/clientes with no params by default', () => {
    service.getClientesTab().subscribe((res) => {
      expect(res.total).toBe(2);
    });

    const req = http.expectOne(`${BASE}/intranet/clientes`);
    expect(req.request.method).toBe('GET');
    req.flush(CLIENTES_RESPONSE);
  });

  it('should append page and page_size query params when provided', () => {
    service.getClientesTab({ page: 2, page_size: 10 }).subscribe();

    const req = http.expectOne(`${BASE}/intranet/clientes?page=2&page_size=10`);
    expect(req.request.method).toBe('GET');
    req.flush(CLIENTES_RESPONSE);
  });
});
