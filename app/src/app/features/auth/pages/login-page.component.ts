import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { SessionStorageService } from '../../../core/services/session-storage.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApiService = inject(AuthApiService);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly heroVideos = ['/asesoriaescano.mp4', '/asesoriaescano2.mp4'];

  protected readonly loading = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly submitAttempted = signal(false);
  protected readonly currentHeroVideoIndex = signal(0);

  /** Paso del flujo de login: credenciales o código OTP */
  protected readonly step = signal<'credentials' | 'otp'>('credentials');
  /** session_id devuelto por el backend cuando requires_2fa=true */
  protected readonly sessionId = signal('');
  protected readonly otpSubmitAttempted = signal(false);

  protected readonly loginForm = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(9)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]],
  });

  protected get currentHeroVideo(): string {
    return this.heroVideos[this.currentHeroVideoIndex()];
  }

  protected login(): void {
    this.submitAttempted.set(true);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Revisa los campos marcados antes de continuar.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authApiService.login(this.loginForm.getRawValue()).subscribe({
      next: (response) => {
        if (response.requires_2fa) {
          // Paso 2FA: mostrar formulario OTP
          this.sessionId.set(response.session_id!);
          this.step.set('otp');
          this.loading.set(false);
          return;
        }
        this.completeLogin(response.access_token!, response.user!);
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail ?? 'No se pudo iniciar sesión';
        this.errorMessage.set(detail);
        this.loading.set(false);
      },
    });
  }

  protected submitOtp(): void {
    this.otpSubmitAttempted.set(true);

    // Limpiar espacios que puedan venir al copiar del SMS
    const rawCode = this.otpForm.controls.code.value.trim().replace(/\s/g, '');
    this.otpForm.controls.code.setValue(rawCode, { emitEvent: false });

    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      this.errorMessage.set('Introduce un código de 6 dígitos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authApiService.verifyOtp({
      session_id: this.sessionId(),
      code: this.otpForm.getRawValue().code,
    }).subscribe({
      next: (response) => {
        this.completeLogin(response.access_token!, response.user!);
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail ?? 'Código inválido o expirado';
        this.errorMessage.set(detail);
        this.loading.set(false);
      },
    });
  }

  protected backToCredentials(): void {
    this.step.set('credentials');
    this.sessionId.set('');
    this.otpForm.reset();
    this.otpSubmitAttempted.set(false);
    this.errorMessage.set('');
  }

  private completeLogin(token: string, user: { id: string; nombre_usuario: string; role: string }): void {
    // Limpiar datos del empleado anterior antes de establecer la nueva sesión
    this.empleadoService.clearCachedEmpleado();
    this.sessionStorageService.setSession(token, user);
    this.successMessage.set(`Accediendo al sistema como ${user.role}...`);

    this.empleadoService.me().pipe(take(1)).subscribe({
      next: () => {
        this.loading.set(false);
        this.authApiService.redirectToDashboard();
      },
      error: () => {
        this.loading.set(false);
        this.authApiService.redirectToDashboard();
      },
    });
  }

  protected hasError(fieldName: 'dni' | 'password'): boolean {
    const field = this.loginForm.controls[fieldName];
    return field.invalid && (field.touched || this.submitAttempted());
  }

  protected hasOtpError(): boolean {
    const field = this.otpForm.controls.code;
    return field.invalid && (field.touched || this.otpSubmitAttempted());
  }

  protected getFieldError(fieldName: 'dni' | 'password'): string {
    const field = this.loginForm.controls[fieldName];

    if (field.errors?.['required']) {
      return 'Este campo es obligatorio.';
    }

    if (field.errors?.['minlength']) {
      if (fieldName === 'password') {
        return 'La contraseña debe tener al menos 8 caracteres.';
      }
      return 'El DNI debe tener 9 caracteres (8 números y letra).';
    }

    if (field.errors?.['maxlength']) {
      return 'El DNI debe tener exactamente 9 caracteres.';
    }

    return 'Valor inválido.';
  }

  protected onHeroVideoEnded(videoElement: HTMLVideoElement): void {
    const nextIndex = (this.currentHeroVideoIndex() + 1) % this.heroVideos.length;
    this.currentHeroVideoIndex.set(nextIndex);
    videoElement.src = this.heroVideos[nextIndex];
    videoElement.load();
    void videoElement.play().catch(() => undefined);
  }
}

