import { Injectable } from '@angular/core';

import { AuthUser } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class SessionStorageService {
  private readonly tokenKey = 'auth_token';
  private readonly userKey = 'auth_user';
  private readonly empleadoKey = 'empleado_profile';

  setSession(token: string, user: AuthUser): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.empleadoKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
