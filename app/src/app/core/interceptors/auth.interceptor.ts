import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SessionStorageService } from '../services/session-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionStorageService = inject(SessionStorageService);
  const token = sessionStorageService.getToken();

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
