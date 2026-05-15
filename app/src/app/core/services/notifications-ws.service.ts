import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { NotificationItem } from '../models/notification.model';
import { NotificationsService } from './notifications.service';
import { SessionStorageService } from './session-storage.service';

@Injectable({ providedIn: 'root' })
export class NotificationsWsService {
  private readonly sessionStorage = inject(SessionStorageService);
  private readonly notificationsService = inject(NotificationsService);
  private socket: WebSocket | null = null;

  connect(): void {
    if (this.socket || !('WebSocket' in window)) {
      return;
    }
    const token = this.sessionStorage.getToken();
    if (!token) {
      return;
    }
    const wsUrl = `${environment.apiUrl.replace(/^http/, 'ws')}/intranet/notifications/ws?token=${encodeURIComponent(token)}`;
    this.socket = new WebSocket(wsUrl);
    this.socket.onmessage = (event) => this.handleMessage(event);
    this.socket.onclose = () => {
      this.socket = null;
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  private handleMessage(event: MessageEvent<string>): void {
    try {
      const item = JSON.parse(event.data) as NotificationItem;
      this.notificationsService.notifications.update((items) => [item, ...items.filter((existing) => existing.id !== item.id)]);
      this.notificationsService.noLeidas.update((count) => count + (item.leida ? 0 : 1));
      const electronBridge = (window as unknown as { gestorIA?: { notify?: (payload: unknown) => void } }).gestorIA;
      electronBridge?.notify?.({ title: item.titulo, body: item.mensaje, url: item.deep_link });
    } catch {
      return;
    }
  }
}
