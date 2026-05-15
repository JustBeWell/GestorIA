import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationsWsService } from '../../../core/services/notifications-ws.service';
import { PushSubscriptionService } from '../../../core/services/push-subscription.service';
import { NotificationsBellComponent } from './notifications-bell.component';

describe('NotificationsBellComponent', () => {
  let fixture: ComponentFixture<NotificationsBellComponent>;
  const notifications = signal([
    {
      id: 'n1',
      tipo: 'TASK_ASSIGNED' as const,
      prioridad: 'media' as const,
      titulo: 'Trabajo asignado',
      mensaje: 'Modelo 303',
      entidad: 'trabajo',
      entidad_id: 't1',
      deep_link: '/trabajos/t1',
      metadata: {},
      leida: false,
      archivada: false,
      created_at: '2026-05-15T08:00:00Z',
    },
  ]);
  const noLeidas = signal(1);
  const criticas = signal(0);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsBellComponent],
      providers: [
        provideRouter([]),
        {
          provide: NotificationsService,
          useValue: {
            notifications,
            noLeidas,
            criticas,
            contador: () => of({ no_leidas: 1, criticas: 0 }),
            list: () => of({ notificaciones: notifications(), no_leidas: 1, paginacion: { page: 1, page_size: 10, total: 1, total_pages: 1 } }),
            marcarTodasLeidas: () => of({ actualizadas: 1 }),
            marcarLeida: () => of({ ...notifications()[0], leida: true }),
          },
        },
        { provide: PushSubscriptionService, useValue: { permission: () => 'denied', requestAndSubscribe: () => Promise.resolve(false) } },
        { provide: NotificationsWsService, useValue: { connect: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsBellComponent);
    fixture.detectChanges();
  });

  it('renders unread badge', () => {
    expect(fixture.nativeElement.querySelector('.badge')?.textContent.trim()).toBe('1');
  });

  it('opens dropdown with recent notifications', () => {
    fixture.nativeElement.querySelector('.bell-button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Trabajo asignado');
  });
});
