import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, defer, of, delay, tap, throwError } from 'rxjs';

import { AuthResponse, AuthUser, LoginRequest } from './auth.models';
import { TokenStorageService } from './token-storage.service';
import { UsersService } from '../users/users.service';
import { randomDelay, uid } from '../../shared/utils/random';

interface BufferLike {
  from(value: string, encoding: string): { toString(encoding: string): string };
}

class MockHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly usersService = inject(UsersService);

  readonly currentUser$ = new BehaviorSubject<AuthUser | null>(
    this.tokenStorage.isAuthenticated() ? this.tokenStorage.getUser() : null
  );

  login(request: LoginRequest): Observable<AuthResponse> {
    const remember = request.remember ?? false;

    return defer(() => {
      const normalizedEmail = request.email.trim().toLowerCase();
      const user = this.usersService.findByEmail(normalizedEmail);

      if (!user) {
        return this.reject(401, 'Credenciales inválidas.');
      }

      if (request.password !== 'Demo1234') {
        return this.reject(401, 'Credenciales inválidas.');
      }

      if (!user.active) {
        return this.reject(403, 'El usuario no está activo.');
      }

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles
      };

      const accessToken = this.createAccessToken(authUser);
      const refreshToken = uid('rt');
      const response: AuthResponse = {
        accessToken,
        refreshToken,
        user: authUser
      };

      return of(response).pipe(
        delay(randomDelay()),
        tap(() => {
          this.tokenStorage.setTokens(accessToken, refreshToken, remember);
          this.tokenStorage.setUser(authUser);
          this.currentUser$.next(authUser);
        })
      );
    });
  }

  logout(): void {
    this.tokenStorage.clear();
    this.currentUser$.next(null);
    void this.router.navigateByUrl('/login');
  }

  me(): Observable<AuthUser | null> {
    return this.currentUser$.asObservable();
  }

  private createAccessToken(user: AuthUser): string {
    const header = this.toBase64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = this.toBase64Url({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2
    });
    const signature = 'signature';

    return `${header}.${payload}.${signature}`;
  }

  private toBase64Url(value: unknown): string {
    const json = JSON.stringify(value);

    if (typeof btoa === 'function') {
      return btoa(json).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }

    const buffer = (globalThis as { Buffer?: BufferLike }).Buffer;

    if (buffer) {
      return buffer
        .from(json, 'utf-8')
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    }

    throw new Error('No encoder available for the current environment.');
  }

  private reject(status: number, message: string): Observable<never> {
    return throwError(() => new MockHttpError(status, message)).pipe(delay(randomDelay()));
  }
}
