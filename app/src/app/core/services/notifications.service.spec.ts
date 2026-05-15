import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { NotificationsService } from './notifications.service';
import { NotificationsListResponse } from '../models/notification.model';

const BASE = `${environment.apiUrl}/intranet/notifications`;

const LIST_RESPONSE: NotificationsListResponse = {
  notificaciones: [
    {
      id: 'n1',
      tipo: 'TASK_ASSIGNED',
      prioridad: 'media',
      titulo: 'Te han asignado un trabajo',
      mensaje: 'Modelo 303',
      entidad: 'trabajo',
      entidad_id: 't1',
      deep_link: '/trabajos/t1',
      metadata: {},
      leida: false,
      archivada: false,
      created_at: '2026-05-15T08:00:00Z',
    },
  ],
  no_leidas: 1,
  paginacion: { page: 1, page_size: 10, total: 1, total_pages: 1 },
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NotificationsService],
    });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists notifications and updates local signals', () => {
    service.list({ page: 1, page_size: 10, solo_no_leidas: true }).subscribe();

    const req = http.expectOne(`${BASE}?page=1&page_size=10&solo_no_leidas=true`);
    expect(req.request.method).toBe('GET');
    req.flush(LIST_RESPONSE);

    expect(service.notifications().length).toBe(1);
    expect(service.noLeidas()).toBe(1);
  });

  it('marks one notification as read optimistically after API response', () => {
    service.list({ page: 1, page_size: 10 }).subscribe();
    http.expectOne(`${BASE}?page=1&page_size=10`).flush(LIST_RESPONSE);

    service.marcarLeida('n1').subscribe();

    const req = http.expectOne(`${BASE}/n1/leer`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...LIST_RESPONSE.notificaciones[0], leida: true });

    expect(service.notifications()[0].leida).toBe(true);
    expect(service.noLeidas()).toBe(0);
  });
});
