import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { EmpleadoModel } from '../../../core/models/empleado.model';
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

  protected readonly empleado = signal<EmpleadoModel | null>(null);
  protected readonly editMode = signal(false);
  protected readonly saving = signal(false);
  protected readonly profileSuccess = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordSaving = signal(false);
  protected readonly passwordSuccess = signal(false);
  protected readonly passwordError = signal<string | null>(null);

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
}
