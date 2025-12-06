import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { AuthUser } from './auth.models';
import { DEBUG } from '../debug';

type AppRole = 'USER' | 'ADMIN';

const extractRequiredRoles = (route: ActivatedRouteSnapshot): AppRole[] => {
  const roles = route.data?.['roles'];

  if (Array.isArray(roles)) {
    return roles.filter(
      (role): role is AppRole =>
        typeof role === 'string' && (role === 'USER' || role === 'ADMIN')
    );
  }

  return [];
}

const resolveCurrentUser = (
  tokenStorage: TokenStorageService,
  authService: AuthService
): AuthUser | null => {
  const storedUser = tokenStorage.getUser();

  if (storedUser) {
    return storedUser;
  }

  return authService.currentUser$.getValue();
};

export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);

  const requiredRoles = extractRequiredRoles(route);
  const isAuthenticated = tokenStorage.isAuthenticated();
  DEBUG && console.debug('[GUARD role]', { requiredRoles, isAuthenticated });

  if (!requiredRoles.length) {
    return true;
  }

  const currentUser = resolveCurrentUser(tokenStorage, authService);
  const userRoles: AppRole[] = (currentUser?.roles ?? []).filter(
    (role): role is AppRole => role === 'USER' || role === 'ADMIN'
  );
  DEBUG && console.debug('[GUARD role] user roles', { requiredRoles, userRoles });

  if (!currentUser) {
    void router.navigateByUrl('/login', { replaceUrl: true });
    return false;
  }

  const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

  if (!hasRequiredRole) {
    void router.navigateByUrl('/home', { replaceUrl: true });
  }

  return hasRequiredRole;
};
