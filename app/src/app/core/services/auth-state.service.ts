import { Injectable, signal, computed } from '@angular/core';

import { AuthUser } from '../models/auth.models';
import { SessionStorageService } from './session-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly session = new SessionStorageService();

  private readonly _currentUser = signal<AuthUser | null>(
    this.session.getUser()
  );

  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  login(token: string, user: AuthUser): void {
    this.session.setSession(token, user);
    this._currentUser.set(user);
  }

  logout(): void {
    this.session.clearSession();
    this._currentUser.set(null);
  }
}
