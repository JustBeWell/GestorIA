import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  NotificationItem,
  NotificationPreferenceItem,
  NotificationPreferenceUpdate,
  NotificationsCounterResponse,
  NotificationsListResponse,
  NotificationsQuery,
  PushSubscriptionItem,
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/intranet/notifications`;

  readonly notifications = signal<NotificationItem[]>([]);
  readonly noLeidas = signal(0);
  readonly criticas = signal(0);
  readonly cargando = signal(false);

  list(params: NotificationsQuery = {}): Observable<NotificationsListResponse> {
    this.cargando.set(true);
    return this.http.get<NotificationsListResponse>(this.base, { params: this.toParams(params) }).pipe(
      tap((response) => {
        this.notifications.set(response.notificaciones);
        this.noLeidas.set(response.no_leidas);
        this.cargando.set(false);
      }),
    );
  }

  contador(): Observable<NotificationsCounterResponse> {
    return this.http.get<NotificationsCounterResponse>(`${this.base}/contador`).pipe(
      tap((response) => {
        this.noLeidas.set(response.no_leidas);
        this.criticas.set(response.criticas);
      }),
    );
  }

  marcarLeida(id: string): Observable<NotificationItem> {
    return this.http.post<NotificationItem>(`${this.base}/${id}/leer`, {}).pipe(
      tap((updated) => {
        this.notifications.update((items) => items.map((item) => (item.id === id ? updated : item)));
        this.noLeidas.update((value) => Math.max(0, value - 1));
      }),
    );
  }

  marcarTodasLeidas(): Observable<{ actualizadas: number }> {
    return this.http.post<{ actualizadas: number }>(`${this.base}/leer-todas`, {}).pipe(
      tap(() => {
        this.notifications.update((items) => items.map((item) => ({ ...item, leida: true })));
        this.noLeidas.set(0);
        this.criticas.set(0);
      }),
    );
  }

  archivar(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/archivar`, {}).pipe(
      tap(() => this.notifications.update((items) => items.filter((item) => item.id !== id))),
    );
  }

  obtenerPreferencias(): Observable<{ preferencias: NotificationPreferenceItem[] }> {
    return this.http.get<{ preferencias: NotificationPreferenceItem[] }>(`${this.base}/preferencias`);
  }

  actualizarPreferencia(tipo: string, partial: NotificationPreferenceUpdate): Observable<NotificationPreferenceItem> {
    return this.http.patch<NotificationPreferenceItem>(`${this.base}/preferencias/${tipo}`, partial);
  }

  vapidPublicKey(): Observable<{ publicKey: string }> {
    return this.http.get<{ publicKey: string }>(`${this.base}/vapid-public-key`);
  }

  subscribePush(subscription: PushSubscriptionJSON, plataforma: 'web' | 'electron' = 'web'): Observable<PushSubscriptionItem> {
    return this.http.post<PushSubscriptionItem>(`${this.base}/push-subscriptions`, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      plataforma,
      user_agent: navigator.userAgent,
    });
  }

  listSubscriptions(): Observable<{ suscripciones: PushSubscriptionItem[] }> {
    return this.http.get<{ suscripciones: PushSubscriptionItem[] }>(`${this.base}/push-subscriptions`);
  }

  deleteSubscription(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/push-subscriptions/${id}`);
  }

  sendTest(): Observable<{ notification_id: string }> {
    return this.http.post<{ notification_id: string }>(`${this.base}/test`, {});
  }

  private toParams(params: NotificationsQuery): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
