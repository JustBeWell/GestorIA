import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NotificationsService } from './notifications.service';

@Injectable({ providedIn: 'root' })
export class PushSubscriptionService {
  private readonly notificationsService = inject(NotificationsService);

  permission(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async requestAndSubscribe(plataforma: 'web' | 'electron' = 'web'): Promise<boolean> {
    if (this.permission() === 'unsupported') {
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }
    const [{ publicKey }, registration] = await Promise.all([
      firstValueFrom(this.notificationsService.vapidPublicKey()),
      navigator.serviceWorker.ready,
    ]);
    if (!publicKey) {
      return false;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(publicKey),
    });
    await firstValueFrom(this.notificationsService.subscribePush(subscription.toJSON(), plataforma));
    return true;
  }

  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer.slice(0) as ArrayBuffer;
  }
}
