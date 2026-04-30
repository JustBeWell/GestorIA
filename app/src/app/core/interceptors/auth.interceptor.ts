import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStateService } from '../services/auth-state.service';
import { SessionStorageService } from '../services/session-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionStorageService = inject(SessionStorageService);
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const token = sessionStorageService.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // Token expirado o inválido — limpiar sesión y redirigir al login
        authState.logout();
        void router.navigateByUrl('/auth');
      } else if (err.status === 403) {
        // Forbidden — redirigir a home sin forzar logout
        void router.navigateByUrl('/home');
      }
      // Para 500+ y otros errores, dejar que el componente los maneje
      return throwError(() => err);
    }),
  );
};
