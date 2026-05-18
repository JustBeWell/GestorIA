import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { ThemeService, AppTheme } from '../../../core/services/theme.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { EmpleadoModel, EmpresaConfig } from '../../../core/models/empleado.model';
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
  protected readonly mfaSaving = signal(false);
  protected readonly mfaError = signal<string | null>(null);
  protected readonly companyLoading = signal(false);
  protected readonly companySaving = signal(false);
  protected readonly companySuccess = signal(false);
  protected readonly companyError = signal<string | null>(null);
  protected readonly companyConfig = signal<EmpresaConfig | null>(null);

  protected readonly activeTab = signal<'cuenta' | 'empresa' | 'notificaciones'>('cuenta');

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
  protected readonly isAdmin = computed(() => this.empleado()?.rol === 'administrador');

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

  protected readonly companyForm = this.fb.group({
    nombre_fiscal: ['', [Validators.required, Validators.maxLength(255)]],
    cif_nif: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    telefono: ['', [Validators.maxLength(20)]],
    direccion: ['', [Validators.maxLength(255)]],
    codigo_postal: ['', [Validators.maxLength(10)]],
    ciudad: ['', [Validators.maxLength(100)]],
    provincia: ['', [Validators.maxLength(100)]],
    web: ['', [Validators.maxLength(255)]],
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

    this.loadCompanyConfig();
  }

  protected loadCompanyConfig(): void {
    this.companyLoading.set(true);
    this.companyError.set(null);
    this.empleadoService.getCompanyConfig().subscribe({
      next: (config) => {
        this.companyConfig.set(config);
        this.companyForm.patchValue({
          nombre_fiscal: config.nombre_fiscal,
          cif_nif: config.cif_nif,
          email: config.email ?? '',
          telefono: config.telefono ?? '',
          direccion: config.direccion ?? '',
          codigo_postal: config.codigo_postal ?? '',
          ciudad: config.ciudad ?? '',
          provincia: config.provincia ?? '',
          web: config.web ?? '',
        });
        this.companyLoading.set(false);
      },
      error: (err) => {
        this.companyError.set(err?.error?.detail ?? 'No se pudo cargar la configuración de empresa.');
        this.companyLoading.set(false);
      },
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

  protected toggleMfa(enabled: boolean): void {
    if (this.mfaSaving()) return;
    this.mfaSaving.set(true);
    this.mfaError.set(null);
    this.empleadoService.updateMfa(enabled).subscribe({
      next: (updated) => {
        this.empleado.set(updated);
        this.mfaSaving.set(false);
      },
      error: (err) => {
        this.mfaError.set(err?.error?.detail ?? 'No se pudo actualizar la verificación en dos pasos.');
        this.mfaSaving.set(false);
      },
    });
  }

  protected saveCompanyConfig(): void {
    if (this.companyForm.invalid || this.companySaving() || !this.isAdmin()) return;

    const raw = this.companyForm.getRawValue();
    const payload: EmpresaConfig = {
      nombre_fiscal: raw.nombre_fiscal?.trim() ?? '',
      cif_nif: raw.cif_nif?.trim().toUpperCase() ?? '',
      email: raw.email?.trim() || null,
      telefono: raw.telefono?.trim() || null,
      direccion: raw.direccion?.trim() || null,
      codigo_postal: raw.codigo_postal?.trim() || null,
      ciudad: raw.ciudad?.trim() || null,
      provincia: raw.provincia?.trim() || null,
      web: raw.web?.trim() || null,
      updated_at: this.companyConfig()?.updated_at ?? null,
    };

    this.companySaving.set(true);
    this.companyError.set(null);
    this.empleadoService.updateCompanyConfig(payload).subscribe({
      next: (config) => {
        this.companyConfig.set(config);
        this.companySaving.set(false);
        this.companySuccess.set(true);
        setTimeout(() => this.companySuccess.set(false), 3000);
      },
      error: (err) => {
        this.companyError.set(err?.error?.detail ?? 'No se pudo guardar la configuración de empresa.');
        this.companySaving.set(false);
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
