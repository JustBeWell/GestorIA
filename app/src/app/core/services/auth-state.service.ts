import { Injectable, signal, computed } from '@angular/core';

import { AuthUser } from '../models/auth.models';
import { SessionStorageService } from './session-storage.service';

/**
 * Reactive global auth state via Angular signals.
 * Components read `currentUser` or `isAuthenticated` instead of
 * calling SessionStorageService.getUser() on every interaction.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly session = new SessionStorageService();

  private readonly _currentUser = signal<AuthUser | null>(
    this.session.getUser()
  );

  /** Read-only signal — current authenticated user or null. */
  readonly currentUser = this._currentUser.asReadonly();

  /** Derived signal — true when a user is logged in. */
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /** Persist session and update signal. */
  login(token: string, user: AuthUser): void {
    this.session.setSession(token, user);
    this._currentUser.set(user);
  }

  /** Clear persisted session and reset signal. */
  logout(): void {
    this.session.clearSession();
    this._currentUser.set(null);
  }
}
