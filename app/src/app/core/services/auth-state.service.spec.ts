import { TestBed } from '@angular/core/testing';

import { AuthUser } from '../models/auth.models';
import { AuthStateService } from './auth-state.service';
import { SessionStorageService } from './session-storage.service';

const MOCK_USER: AuthUser = {
  id: 'user-1',
  nombre_usuario: 'test@gestoria.local',
  role: 'empleado',
};

describe('AuthStateService', () => {
  let service: AuthStateService;
  let sessionSpy: jasmine.SpyObj<SessionStorageService>;

  beforeEach(() => {
    sessionSpy = jasmine.createSpyObj('SessionStorageService', [
      'getUser',
      'setSession',
      'clearSession',
    ]);
    sessionSpy.getUser.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        AuthStateService,
        { provide: SessionStorageService, useValue: sessionSpy },
      ],
    });

    service = TestBed.inject(AuthStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialise currentUser from session storage', () => {
    sessionSpy.getUser.and.returnValue(MOCK_USER);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthStateService,
        { provide: SessionStorageService, useValue: sessionSpy },
      ],
    });
    const s = TestBed.inject(AuthStateService);
    expect(s.currentUser()).toEqual(MOCK_USER);
  });

  it('currentUser() should be null initially when no session', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('isAuthenticated() should be false when no user', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('login() should update currentUser signal and persist session', () => {
    service.login('token-abc', MOCK_USER);

    expect(service.currentUser()).toEqual(MOCK_USER);
    expect(service.isAuthenticated()).toBeTrue();
    expect(sessionSpy.setSession).toHaveBeenCalledWith('token-abc', MOCK_USER);
  });

  it('logout() should clear currentUser signal and session', () => {
    service.login('token-abc', MOCK_USER);
    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(sessionSpy.clearSession).toHaveBeenCalled();
  });
});
