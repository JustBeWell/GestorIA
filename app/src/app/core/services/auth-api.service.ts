import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.models';
import { SessionStorageService } from './session-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStorageService);

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload);
  }

  logout(): void {
    const token = this.session.getToken();
    if (token) {
      // Fire-and-forget: revoke server-side, then clear local storage regardless
      this.http
        .post(`${environment.apiUrl}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .subscribe({ error: () => {} });
    }
    this.session.clearSession();
    void this.router.navigateByUrl('/login');
  }

  redirectToDashboard(): void {
    void this.router.navigateByUrl('/home');
  }
}
