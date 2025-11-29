import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { AuthResponse, AuthUser, LoginRequest, PrivateUserProfile } from './auth.models';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../../../environments/environment';
import { DEBUG } from '../debug';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly apiBaseUrl = environment.apiBaseUrl;

  /**
   * Usuario actual en memoria.
   * TypeScript lo tipa como AuthUser, pero en runtime también podemos guardar
   * PrivateUserProfile (que extiende AuthUser) cuando viene de /auth/me.
   */
  readonly currentUser$ = new BehaviorSubject<AuthUser | null>(
    this.tokenStorage.getUser()
  );

  /**
   * Flag para evitar pedir /auth/me más de una vez por sesión.
   */
  private profileLoaded = false;

  /**
   * Login contra /auth/login.
   * - Guarda accessToken en storage (respeta rememberMe).
   * - Guarda user básico en storage.
   * - Actualiza currentUser$.
   */
  login(payload: LoginRequest): Observable<AuthUser> {
    const url = `${this.apiBaseUrl}/api/auth/login`;

    DEBUG &&
      console.debug('[AUTH] login request', {
        url,
        usernameOrEmail: payload.usernameOrEmail,
        rememberMe: payload.rememberMe
      });

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap((response) => {
        DEBUG &&
          console.debug('[AUTH] login response', {
            success: response.success,
            user: response.user
          });

        this.tokenStorage.setTokens(response.accessToken, !!payload.rememberMe);
        this.tokenStorage.setUser(response.user);
        this.currentUser$.next(response.user);
      }),
      map((response) => response.user)
    );
  }

  /**
   * Cierra sesión en el cliente:
   * - Limpia tokens y usuario en storage.
   * - Resetea currentUser$.
   * - Navega a /login.
   */
  logout(): void {
    DEBUG && console.debug('[AUTH] logout');

    this.profileLoaded = false;
    this.tokenStorage.clear();
    this.currentUser$.next(null);

    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /**
   * Devuelve un stream del usuario actual.
   *
   * Primera vez:
   * - Si no hay token válido → emite null.
   * - Si hay token válido y todavía no cargamos el perfil → hace GET /auth/me.
   *
   * Luego:
   * - Devuelve simplemente currentUser$ como observable.
   */
  me(): Observable<AuthUser | null> {
    const alreadyLoaded = this.profileLoaded;
    const tokenIsValid = this.tokenStorage.isAuthenticated();

    DEBUG &&
      console.debug('[AUTH] me()', {
        alreadyLoaded,
        tokenIsValid
      });

    if (!tokenIsValid) {
      this.profileLoaded = true;
      this.currentUser$.next(null);
      return this.currentUser$.asObservable();
    }

    if (!alreadyLoaded) {
      this.profileLoaded = true;

      const url = `${this.apiBaseUrl}/api/auth/me`;

      this.http
        .get<PrivateUserProfile>(url)
        .pipe(
          tap((user) => {
            DEBUG && console.debug('[AUTH] /auth/me success', { user });
            // Guardamos el perfil completo en storage; el tipo de setUser es AuthUser,
            // pero PrivateUserProfile extiende AuthUser así que es compatible.
            this.tokenStorage.setUser(user);
            this.currentUser$.next(user);
          }),
          catchError((error) => {
            DEBUG && console.debug('[AUTH] /auth/me error', error);
            this.tokenStorage.clear();
            this.currentUser$.next(null);
            return of(null);
          })
        )
        .subscribe();
    }

    return this.currentUser$.asObservable();
  }

  /**
   * Actualiza datos del perfil del usuario logueado (username, email, avatarUrl, bio).
   * Usa PATCH /users/:id y sincroniza:
   * - currentUser$
   * - TokenStorageService
   *
   * Asumimos que el endpoint devuelve un UserDto con:
   * { id, username, email, roles, isActive, createdAt, avatarUrl, bio }
   */
  updateProfile(payload: {
    username?: string;
    email?: string;
    avatarUrl?: string | null;
    bio?: string | null;
  }): Observable<PrivateUserProfile> {
    const current = this.currentUser$.getValue();

    if (!current) {
      throw new Error('NO_AUTH_USER');
    }

    const userId = String(current.id);
    const url = `${this.apiBaseUrl}/api/users/${userId}`;

    DEBUG &&
      console.debug('[AUTH] updateProfile request', {
        url,
        payload
      });

    return this.http
      .patch<{
        id: number;
        username: string;
        email: string;
        roles: ('USER' | 'ADMIN')[];
        isActive: boolean;
        createdAt: string;
        avatarUrl: string | null;
        bio: string | null;
      }>(url, payload)
      .pipe(
        map((dto) => {
          const previous = this.currentUser$.getValue() as
            | PrivateUserProfile
            | AuthUser
            | null;

          const stats =
            previous && 'stats' in previous
              ? (previous as PrivateUserProfile).stats
              : {
                  reviewsCount: 0,
                  reputation: {
                    upvotes: 0,
                    downvotes: 0,
                    score: 0,
                    likesRate: 0
                  }
                };

          const updated: PrivateUserProfile = {
            id: dto.id,
            username: dto.username,
            email: dto.email,
            roles: dto.roles,
            createdAt: dto.createdAt,
            avatarUrl: dto.avatarUrl,
            bio: dto.bio,
            stats
          };

          DEBUG && console.debug('[AUTH] updateProfile response', { updated });

          this.tokenStorage.setUser(updated);
          this.currentUser$.next(updated);

          return updated;
        })
      );
  }
}
