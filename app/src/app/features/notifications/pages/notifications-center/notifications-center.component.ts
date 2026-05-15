import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NotificationItem } from '../../../../core/models/notification.model';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { IntranetSidebarComponent } from '../../../../shared/components/intranet-sidebar/intranet-sidebar.component';

type NotificationTab = 'todas' | 'no_leidas' | 'facturas' | 'trabajos' | 'archivadas';

@Component({
  selector: 'app-notifications-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IntranetSidebarComponent],
  templateUrl: './notifications-center.component.html',
  styleUrl: './notifications-center.component.css',
})
export class NotificationsCenterComponent implements OnInit {
  protected readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<NotificationTab>('todas');
  protected readonly priority = signal('');
  protected readonly type = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    const tab = this.activeTab();
    this.notificationsService.list({
      page: 1,
      page_size: 100,
      solo_no_leidas: tab === 'no_leidas',
      archivadas: tab === 'archivadas' ? true : false,
      tipo: this.type() || undefined,
      desde: this.dateFrom() || undefined,
      hasta: this.dateTo() || undefined,
    }).subscribe();
  }

  protected setTab(tab: NotificationTab): void {
    this.activeTab.set(tab);
    this.load();
  }

  protected visibleNotifications(): NotificationItem[] {
    return this.notificationsService.notifications().filter((item) => {
      if (this.activeTab() === 'facturas' && !item.tipo.startsWith('INV_')) {
        return false;
      }
      if (this.activeTab() === 'trabajos' && !item.tipo.startsWith('TASK_')) {
        return false;
      }
      if (this.priority() && item.prioridad !== this.priority()) {
        return false;
      }
      return true;
    });
  }

  protected groupedNotifications(): { day: string; items: NotificationItem[] }[] {
    const groups = new Map<string, NotificationItem[]>();
    this.visibleNotifications().forEach((item) => {
      const day = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(new Date(item.created_at));
      groups.set(day, [...(groups.get(day) ?? []), item]);
    });
    return Array.from(groups.entries()).map(([day, items]) => ({ day, items }));
  }

  protected markRead(item: NotificationItem): void {
    this.notificationsService.marcarLeida(item.id).subscribe();
  }

  protected archive(item: NotificationItem): void {
    this.notificationsService.archivar(item.id).subscribe();
  }

  protected openLink(item: NotificationItem): void {
    if (item.deep_link) {
      void this.router.navigateByUrl(item.deep_link);
    }
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  private readonly TIPO_LABELS: Record<string, string> = {
    INV_DUE_SOON:          'Factura próxima a vencer',
    INV_DUE_TODAY:         'Factura vence hoy',
    INV_OVERDUE_WEEKLY:    'Resumen de impagos',
    TASK_DEADLINE_SOON:    'Plazo próximo',
    TASK_DEADLINE_TODAY:   'Vence hoy',
    TASK_ASSIGNED:         'Trabajo asignado',
    TASK_UNASSIGNED:       'Trabajo retirado',
    TASK_STATE_CHANGED:    'Cambio de estado',
    TASK_CANCELLED:        'Trabajo cancelado',
    TASK_COMMENT_NEW:      'Nuevo comentario',
    TASK_PRIORITY_CHANGED: 'Cambio de prioridad',
  };

  protected tipoLabel(tipo: string): string {
    return this.TIPO_LABELS[tipo] ?? tipo;
  }

  private readonly ENTIDAD_LABELS: Record<string, string> = {
    trabajo:  'Trabajo',
    factura:  'Factura',
    cliente:  'Cliente',
    usuario:  'Usuario',
    fichaje:  'Fichaje',
  };

  protected entidadLabel(entidad: string): string {
    return this.ENTIDAD_LABELS[entidad] ?? entidad;
  }

  private readonly RAW_VALUE_FIXES: [RegExp, string][] = [
    [/\ben_curso\b/g,   'en curso'],
    [/\bno_aplica\b/g,  'sin prioridad'],
    [/\bpendiente\b/g,  'pendiente'],
    [/\bbloqueado\b/g,  'bloqueado'],
    [/\bfinalizado\b/g, 'finalizado'],
    [/\bcancelado\b/g,  'cancelado'],
  ];

  protected cleanMessage(msg: string): string {
    return this.RAW_VALUE_FIXES.reduce((s, [re, label]) => s.replace(re, label), msg);
  }
}
