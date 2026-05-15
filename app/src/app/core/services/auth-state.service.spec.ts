import { TestBed } from '@angular/core/testing';

import { AuthUser } from '../models/auth.models';
import { AuthStateService } from './auth-state.service';

const MOCK_USER: AuthUser = {
  id: 'user-1',
  nombre_usuario: 'test@gestoria.local',
  role: 'empleado',
};

describe('AuthStateService', () => {
  let service: AuthStateService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthStateService],
    });

    service = TestBed.inject(AuthStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialise currentUser from session storage', () => {
    localStorage.setItem('auth_user', JSON.stringify(MOCK_USER));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthStateService],
    });
    const s = TestBed.inject(AuthStateService);
    expect(s.currentUser()).toEqual(MOCK_USER);
  });

  it('currentUser() should be null initially when no session', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('isAuthenticated() should be false when no user', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login() should update currentUser signal and persist session', () => {
    service.login('token-abc', MOCK_USER);

    expect(service.currentUser()).toEqual(MOCK_USER);
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('auth_token')).toBe('token-abc');
  });

  it('logout() should clear currentUser signal and session', () => {
    service.login('token-abc', MOCK_USER);
    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
