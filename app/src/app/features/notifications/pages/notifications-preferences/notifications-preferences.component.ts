import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NotificationPreferenceItem, PushSubscriptionItem } from '../../../../core/models/notification.model';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { IntranetSidebarComponent } from '../../../../shared/components/intranet-sidebar/intranet-sidebar.component';

@Component({
  selector: 'app-notifications-preferences',
  standalone: true,
  imports: [CommonModule, RouterLink, IntranetSidebarComponent],
  templateUrl: './notifications-preferences.component.html',
  styleUrl: './notifications-preferences.component.css',
})
export class NotificationsPreferencesComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);

  protected readonly preferences = signal<NotificationPreferenceItem[]>([]);
  protected readonly subscriptions = signal<PushSubscriptionItem[]>([]);
  protected readonly saving = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.notificationsService.obtenerPreferencias().subscribe((response) => this.preferences.set(response.preferencias));
    this.notificationsService.listSubscriptions().subscribe((response) => this.subscriptions.set(response.suscripciones));
  }

  protected toggle(pref: NotificationPreferenceItem, field: 'canal_in_app' | 'canal_web_push' | 'canal_email'): void {
    const nextValue = !pref[field];
    this.preferences.update((items) =>
      items.map((item) => (item.tipo === pref.tipo ? { ...item, [field]: nextValue } : item)),
    );
    this.saving.set(pref.tipo);
    this.notificationsService.actualizarPreferencia(pref.tipo, { [field]: nextValue }).subscribe({
      next: (updated) => {
        this.preferences.update((items) => items.map((item) => (item.tipo === updated.tipo ? updated : item)));
        this.saving.set('');
      },
      error: () => {
        this.preferences.update((items) =>
          items.map((item) => (item.tipo === pref.tipo ? { ...item, [field]: pref[field] } : item)),
        );
        this.saving.set('');
      },
    });
  }

  protected unsubscribeDevice(id: string): void {
    this.notificationsService.deleteSubscription(id).subscribe(() => {
      this.subscriptions.update((items) => items.filter((item) => item.id !== id));
    });
  }

  protected sendTest(): void {
    this.notificationsService.sendTest().subscribe();
  }
}
