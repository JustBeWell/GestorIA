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

  protected readonly loginForm = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(9)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
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
        this.sessionStorageService.setSession(response.access_token, response.user);
        this.successMessage.set(`Accediendo al sistema como ${response.user.role}...`);

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
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail ?? 'No se pudo iniciar sesión';
        this.errorMessage.set(detail);
        this.loading.set(false);
      },
    });

  }

  protected hasError(fieldName: 'dni' | 'password'): boolean {
    const field = this.loginForm.controls[fieldName];
    return field.invalid && (field.touched || this.submitAttempted());
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
    videoElement.load();
    void videoElement.play().catch(() => undefined);
  }
}
