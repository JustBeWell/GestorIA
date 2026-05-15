import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { SessionStorageService } from '../services/session-storage.service';
import { AuthStateService } from '../services/auth-state.service';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let sessionSpy: Partial<Record<keyof SessionStorageService, ReturnType<typeof vi.fn>>>;
  let authStateSpy: Partial<Record<keyof AuthStateService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    sessionSpy = {
      getToken: vi.fn().mockReturnValue('test-jwt'),
      getUser: vi.fn().mockReturnValue(null),
      setSession: vi.fn(),
      clearSession: vi.fn(),
    };
    authStateSpy = {
      logout: vi.fn(),
      login: vi.fn(),
      currentUser: vi.fn(),
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'auth', children: [] }, { path: 'home', children: [] }]),
        { provide: SessionStorageService, useValue: sessionSpy },
        { provide: AuthStateService, useValue: authStateSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should attach Authorization header when token exists', () => {
    const httpClient = TestBed.inject(HttpClient);
    httpClient.get('/api/test').subscribe();

    const req = http.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-jwt');
    req.flush({});
  });

  it('should call authState.logout() on 401 response', () => {
    const httpClient = TestBed.inject(HttpClient);
    httpClient.get('/api/protected').subscribe({ error: () => {} });

    const req = http.expectOne('/api/protected');
    req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authStateSpy.logout).toHaveBeenCalled();
  });
});
