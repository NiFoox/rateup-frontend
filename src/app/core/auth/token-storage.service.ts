import { Injectable } from '@angular/core';

import { AuthUser } from './auth.models';
import { DEBUG } from '../debug';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const USER_KEY = 'auth_user';

interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  exp: number;
}

interface BufferModule {
  from(input: string, encoding: string): { toString(encoding: string): string };
}

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setTokens(accessToken: string, remember = false): void {
    if (!this.isBrowser()) {
      return;
    }

    const primaryStorage = remember ? window.localStorage : window.sessionStorage;
    const secondaryStorage = remember ? window.sessionStorage : window.localStorage;

    primaryStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    secondaryStorage.removeItem(ACCESS_TOKEN_KEY);
    secondaryStorage.removeItem(USER_KEY);

    DEBUG &&
      console.debug('[TOKEN] setTokens', {
        remember,
        accessTokenLength: accessToken.length,
        primary: remember ? 'localStorage' : 'sessionStorage'
      });
  }

  setUser(user: AuthUser): void {
    if (!this.isBrowser()) {
      return;
    }

    const storage = this.getActiveStorage();

    storage.setItem(USER_KEY, JSON.stringify(user));
    this.getSecondaryStorage(storage)?.removeItem(USER_KEY);
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

  getUser(): AuthUser | null {
    if (!this.isBrowser()) {
      return null;
    }

    const storage = this.getStorageContaining(USER_KEY);
    const rawUser = storage?.getItem(USER_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      storage?.removeItem(USER_KEY);
      return null;
    }
  }

  clear(): void {
    if (!this.isBrowser()) {
      return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();

    if (!token) {
      DEBUG && console.debug('[TOKEN] isAuthenticated', { hasToken: false, isValid: false });
      return false;
    }

    const payload = this.decodePayload(token);

    if (payload && typeof payload.exp === 'number') {
      const expiresAt = payload.exp * 1000;
      const isValid = Date.now() < expiresAt;
      DEBUG &&
        console.debug('[TOKEN] isAuthenticated', {
          hasToken: true,
          exp: payload.exp,
          expiresAt,
          isValid
        });
      return isValid;
    }

    DEBUG && console.debug('[TOKEN] isAuthenticated', { hasToken: true, isValid: true, reason: 'opaque' });
    return true;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private getActiveStorage(): Storage {
    if (!this.isBrowser()) {
      throw new Error('Token storage is only available in browser environments.');
    }

    if (window.localStorage.getItem(ACCESS_TOKEN_KEY)) {
      return window.localStorage;
    }

    if (window.sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
      return window.sessionStorage;
    }

    return window.sessionStorage;
  }

  private getSecondaryStorage(active: Storage): Storage | null {
    if (!this.isBrowser()) {
      return null;
    }

    if (active === window.localStorage) {
      return window.sessionStorage;
    }

    if (active === window.sessionStorage) {
      return window.localStorage;
    }

    return null;
  }

  private getStorageContaining(key: string): Storage | null {
    if (!this.isBrowser()) {
      return null;
    }

    if (window.localStorage.getItem(key)) {
      return window.localStorage;
    }

    if (window.sessionStorage.getItem(key)) {
      return window.sessionStorage;
    }

    return null;
  }

  private decodePayload(token: string): TokenPayload | null {
    const segments = token.split('.');

    if (segments.length !== 3) {
      return null;
    }

    const base64Url = segments[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    try {
      const decoded = this.decodeBase64(padded);
      return JSON.parse(decoded) as TokenPayload;
    } catch {
      return null;
    }
  }

  private decodeBase64(value: string): string {
    if (typeof atob === 'function') {
      return atob(value);
    }

    const buffer = (globalThis as { Buffer?: BufferModule }).Buffer;

    if (buffer) {
      return buffer.from(value, 'base64').toString('utf-8');
    }

    throw new Error('No base64 decoder available.');
  }
}
