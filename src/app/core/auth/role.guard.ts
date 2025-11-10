import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { AuthUser } from './auth.models';

const extractRequiredRoles = (route: ActivatedRouteSnapshot): string[] => {
  const roles = route.data?.['roles'];

  if (Array.isArray(roles)) {
    return roles.filter((role): role is string => typeof role === 'string' && role.length > 0);
  }

  return [];
};

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

  if (!requiredRoles.length) {
    return true;
  }

  if (!tokenStorage.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const currentUser = resolveCurrentUser(tokenStorage, authService);

  if (!currentUser) {
    return router.createUrlTree(['/login']);
  }

  const hasRequiredRole = requiredRoles.some((role) => currentUser.roles.includes(role));

  if (hasRequiredRole) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
