import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenStorageService } from './token-storage.service';
import { DEBUG } from '../debug';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const ok = tokenStorage.isAuthenticated();
  DEBUG && console.debug('[GUARD auth]', { ok });

  if (!ok) {
    void router.navigateByUrl('/login', { replaceUrl: true });
  }

  return ok;
};
