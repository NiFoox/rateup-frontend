import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setTokens(accessToken: string, refreshToken?: string, remember = false): void {
    if (!this.isBrowser()) {
      return;
    }

    const primaryStorage = remember ? window.localStorage : window.sessionStorage;
    const secondaryStorage = remember ? window.sessionStorage : window.localStorage;

    primaryStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    if (refreshToken) {
      primaryStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      primaryStorage.removeItem(REFRESH_TOKEN_KEY);
    }

    secondaryStorage.removeItem(ACCESS_TOKEN_KEY);
    secondaryStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  getAccessToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return (
      window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
      window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
    );
  }

  clear(): void {
    if (!this.isBrowser()) {
      return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}
