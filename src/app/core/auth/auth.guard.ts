import { CanActivateFn } from '@angular/router';

import { TokenStorage } from './token-storage';

export const authGuard: CanActivateFn = () => {
  const user = TokenStorage.getUser();
  return Boolean(user?.id);
};
