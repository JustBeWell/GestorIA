import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { SessionStorageService } from '../services/session-storage.service';
import { AuthStateService } from '../services/auth-state.service';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let sessionSpy: jasmine.SpyObj<SessionStorageService>;
  let authStateSpy: jasmine.SpyObj<AuthStateService>;

  beforeEach(() => {
    sessionSpy = jasmine.createSpyObj('SessionStorageService', ['getToken', 'getUser', 'setSession', 'clearSession']);
    authStateSpy = jasmine.createSpyObj('AuthStateService', ['logout', 'login', 'currentUser', 'isAuthenticated']);
    sessionSpy.getToken.and.returnValue('test-jwt');
    sessionSpy.getUser.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SessionStorageService, useValue: sessionSpy },
        { provide: AuthStateService, useValue: authStateSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should attach Authorization header when token exists', () => {
    const httpClient = TestBed.inject(
      (await import('@angular/common/http')).HttpClient
    );
    httpClient.get('/api/test').subscribe();

    const req = http.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-jwt');
    req.flush({});
  });

  it('should call authState.logout() on 401 response', async () => {
    const httpClient = TestBed.inject(
      (await import('@angular/common/http')).HttpClient
    );
    httpClient.get('/api/protected').subscribe({ error: () => {} });

    const req = http.expectOne('/api/protected');
    req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authStateSpy.logout).toHaveBeenCalled();
  });
});
