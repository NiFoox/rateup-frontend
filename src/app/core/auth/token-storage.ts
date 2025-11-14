import { AuthUser } from './auth.models';

const USER_KEY = 'auth_user';

const getStorageValue = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
};

export class TokenStorage {
  static getUser(): AuthUser | null {
    const raw = getStorageValue(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
        return {
          ...parsed,
          roles: Array.isArray(parsed.roles) ? [...parsed.roles] : []
        } satisfies AuthUser;
      }
    } catch {
      // Ignore malformed payloads and treat the session as unauthenticated.
    }

    return null;
  }
}
