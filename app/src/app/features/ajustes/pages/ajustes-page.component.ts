import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { ThemeService, AppTheme } from '../../../core/services/theme.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { EmpleadoModel } from '../../../core/models/empleado.model';
import { NotificationPreferenceItem, NotificationTipo } from '../../../core/models/notification.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ajustes-page',
  standalone: true,
  imports: [CommonModule, IntranetSidebarComponent, ReactiveFormsModule],
  templateUrl: './ajustes-page.component.html',
  styleUrl: './ajustes-page.component.css',
})
export class AjustesPageComponent implements OnInit {
  private readonly empleadoService = inject(EmpleadoService);
  private readonly authApiService = inject(AuthApiService);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly notifService = inject(NotificationsService);
  protected readonly themeService = inject(ThemeService);

  protected readonly empleado = signal<EmpleadoModel | null>(null);
  protected readonly editMode = signal(false);
  protected readonly saving = signal(false);
  protected readonly profileSuccess = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordSaving = signal(false);
  protected readonly passwordSuccess = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly activeTab = signal<'cuenta' | 'notificaciones'>('cuenta');

  protected readonly notifLoading = signal(false);
  protected readonly notifPrefs = signal<NotificationPreferenceItem[]>([]);

  private readonly FACTURAS_TYPES = ['INV_DUE_SOON', 'INV_DUE_TODAY', 'INV_OVERDUE_WEEKLY'];
  private readonly TAREAS_TYPES = [
    'TASK_DEADLINE_SOON', 'TASK_DEADLINE_TODAY', 'TASK_ASSIGNED',
    'TASK_UNASSIGNED', 'TASK_STATE_CHANGED', 'TASK_CANCELLED',
    'TASK_COMMENT_NEW', 'TASK_PRIORITY_CHANGED',
  ];
  private readonly NOTIF_LABELS: Record<string, string> = {
    INV_DUE_SOON:           'Factura próxima a vencer (7 días)',
    INV_DUE_TODAY:          'Factura vence hoy',
    INV_OVERDUE_WEEKLY:     'Resumen semanal de impagos',
    TASK_DEADLINE_SOON:     'Trabajo próximo al plazo',
    TASK_DEADLINE_TODAY:    'Trabajo vence hoy',
    TASK_ASSIGNED:          'Te asignan a un trabajo',
    TASK_UNASSIGNED:        'Te retiran de un trabajo',
    TASK_STATE_CHANGED:     'Cambio de estado de trabajo',
    TASK_CANCELLED:         'Trabajo cancelado',
    TASK_COMMENT_NEW:       'Nuevo comentario en trabajo',
    TASK_PRIORITY_CHANGED:  'Cambio de prioridad de trabajo',
  };

  protected readonly notifPrefsFacturas = computed(() =>
    this.notifPrefs().filter((p) => this.FACTURAS_TYPES.includes(p.tipo)),
  );
  protected readonly notifPrefsTareas = computed(() =>
    this.notifPrefs().filter((p) => this.TAREAS_TYPES.includes(p.tipo)),
  );

  protected notifLabel(tipo: string): string {
    return this.NOTIF_LABELS[tipo] ?? tipo;
  }

  protected readonly profileForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(150)]],
    telefono: ['', [Validators.maxLength(20)]],
  });

  protected readonly passwordForm = this.fb.group({
    current_password: ['', [Validators.required, Validators.minLength(8)]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.empleadoService.me().subscribe({
      next: (data) => {
        this.empleado.set(data);
        this.profileForm.patchValue({
          nombre: data.nombre,
          apellidos: data.apellidos,
          telefono: data.telefono ?? '',
        });
      },
    });

    // Mostrar defaults inmediatamente para que el usuario vea las filas
    const allTypes = [...this.FACTURAS_TYPES, ...this.TAREAS_TYPES];
    this.notifPrefs.set(
      allTypes.map((tipo) => ({
        tipo: tipo as NotificationTipo,
        canal_in_app: true,
        canal_web_push: false,
        canal_email: false,
        silencio_desde: null,
        silencio_hasta: null,
      }))
    );
    // API actualiza silenciosamente con los valores reales guardados
    this.notifService.obtenerPreferencias().subscribe({
      next: (res) => this.notifPrefs.set(res.preferencias),
      error: () => { /* mantener defaults si el backend no responde */ },
    });
  }

  protected toggleNotif(tipo: string, campo: 'canal_in_app' | 'canal_web_push', valor: boolean): void {
    this.notifPrefs.update((prefs) =>
      prefs.map((p) => (p.tipo === tipo ? { ...p, [campo]: valor } : p)),
    );
    this.notifService.actualizarPreferencia(tipo, { [campo]: valor }).subscribe();
  }

  protected startEdit(): void {
    const emp = this.empleado();
    if (emp) {
      this.profileForm.patchValue({
        nombre: emp.nombre,
        apellidos: emp.apellidos,
        telefono: emp.telefono ?? '',
      });
    }
    this.editMode.set(true);
    this.profileSuccess.set(false);
    this.profileError.set(null);
  }

  protected cancelEdit(): void {
    this.editMode.set(false);
    this.profileError.set(null);
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.saving()) return;

    this.saving.set(true);
    this.profileError.set(null);

    this.http.put<EmpleadoModel>(`${environment.apiUrl}/users/me`, this.profileForm.value).subscribe({
      next: (updated) => {
        this.empleado.set(updated);
        this.editMode.set(false);
        this.saving.set(false);
        this.profileSuccess.set(true);
        setTimeout(() => this.profileSuccess.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.profileError.set(err?.error?.detail ?? 'Error al guardar los datos');
      },
    });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid || this.passwordSaving()) return;

    const { new_password, confirm_password } = this.passwordForm.value;
    if (new_password !== confirm_password) {
      this.passwordError.set('Las contraseñas nuevas no coinciden');
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set(null);

    this.http.post(`${environment.apiUrl}/users/me/password`, {
      current_password: this.passwordForm.value.current_password,
      new_password,
    }).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.passwordSuccess.set(false), 4000);
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordError.set(err?.error?.detail ?? 'Error al cambiar la contraseña');
      },
    });
  }

  protected logout(): void {
    this.authApiService.logout();
  }

  protected setTheme(t: AppTheme): void {
    this.themeService.setTheme(t);
  }
}
