import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { NotificationItem } from '../../../core/models/notification.model';
import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationsWsService } from '../../../core/services/notifications-ws.service';
import { PushSubscriptionService } from '../../../core/services/push-subscription.service';

@Component({
  selector: 'app-notifications-bell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications-bell.component.html',
  styleUrl: './notifications-bell.component.css',
})
export class NotificationsBellComponent implements OnInit, OnDestroy {
  protected readonly notificationsService = inject(NotificationsService);
  private readonly pushSubscriptionService = inject(PushSubscriptionService);
  private readonly wsService = inject(NotificationsWsService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  protected readonly open = signal(false);
  protected readonly pushMessage = signal('');
  protected readonly pushPermission = signal<NotificationPermission | 'unsupported'>('unsupported');

  ngOnInit(): void {
    this.pushPermission.set(this.pushSubscriptionService.permission());
    this.notificationsService.contador().pipe(takeUntil(this.destroy$)).subscribe();
    this.notificationsService.list({ page: 1, page_size: 10 }).pipe(takeUntil(this.destroy$)).subscribe();
    this.wsService.connect();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected toggle(): void {
    this.open.update((value) => !value);
    if (this.open()) {
      this.notificationsService.list({ page: 1, page_size: 10 }).pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  protected async activatePush(): Promise<void> {
    const ok = await this.pushSubscriptionService.requestAndSubscribe('web');
    this.pushPermission.set(this.pushSubscriptionService.permission());
    this.pushMessage.set(ok ? 'Notificaciones activadas' : 'No se pudo activar el push en este navegador');
  }

  protected markAll(): void {
    this.notificationsService.marcarTodasLeidas().pipe(takeUntil(this.destroy$)).subscribe();
  }

  protected openNotification(item: NotificationItem): void {
    this.notificationsService.marcarLeida(item.id).pipe(takeUntil(this.destroy$)).subscribe();
    this.open.set(false);
    void this.router.navigateByUrl('/notificaciones');
  }

  protected priorityClass(item: NotificationItem): string {
    return `priority-${item.prioridad}`;
  }

  protected relativeDate(value: string): string {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    if (!Number.isFinite(diffMs)) {
      return '';
    }
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) {
      return `hace ${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `hace ${hours} h`;
    }
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(date);
  }
}
