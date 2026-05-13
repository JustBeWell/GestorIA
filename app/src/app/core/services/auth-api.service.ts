import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, OtpVerifyRequest } from '../models/auth.models';
import { AuthStateService } from './auth-state.service';
import { EmpleadoService } from './empleado.service';
import { SessionStorageService } from './session-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStorageService);
  private readonly authState = inject(AuthStateService);
  private readonly empleadoService = inject(EmpleadoService);

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload);
  }

  verifyOtp(payload: OtpVerifyRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/otp/verify`, payload);
  }

  logout(): void {
    const token = this.session.getToken();
    if (token) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .subscribe({ error: () => {} });
    }
    this.empleadoService.clearCachedEmpleado();
    this.authState.logout();
    void this.router.navigateByUrl('/auth');
  }

  redirectToDashboard(): void {
    void this.router.navigateByUrl('/home');
  }
}
