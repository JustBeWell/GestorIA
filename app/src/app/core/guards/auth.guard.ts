import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStorageService } from '../services/session-storage.service';

export const authGuard: CanActivateFn = () => {
  const sessionStorageService = inject(SessionStorageService);
  const router = inject(Router);

  if (sessionStorageService.getToken()) {
    return true;
  }

  return router.createUrlTree(['/auth']);
};
