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

  readonly currentUser$ = new BehaviorSubject<PrivateUserProfile | AuthUser | null>(
    this.tokenStorage.getUser()
  );

  getCurrentUserSnapshot(): PrivateUserProfile | AuthUser | null {
    return this.currentUser$.getValue();
  }

  private profileLoaded = false;

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

        this.profileLoaded = false;

        this.currentUser$.next(response.user);
      }),
      map((response) => response.user)
    );
  }

  logout(): void {
    DEBUG && console.debug('[AUTH] logout');

    this.profileLoaded = false;
    this.tokenStorage.clear();
    this.currentUser$.next(null);

    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  me(): Observable<PrivateUserProfile | AuthUser | null> {
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
      this.refreshProfile().subscribe();
    }

    return this.currentUser$.asObservable();
  }

  refreshProfile(): Observable<PrivateUserProfile | null> {
    const tokenIsValid = this.tokenStorage.isAuthenticated();

    if (!tokenIsValid) {
      DEBUG && console.debug('[AUTH] refreshProfile() sin token, limpiando sesión');
      this.tokenStorage.clear();
      this.currentUser$.next(null);
      return of(null);
    }

    const url = `${this.apiBaseUrl}/api/auth/me`;

    DEBUG && console.debug('[AUTH] refreshProfile() → GET', url);

    return this.http.get<PrivateUserProfile>(url).pipe(
      tap((user) => {
        DEBUG && console.debug('[AUTH] refreshProfile success', { user });
        this.tokenStorage.setUser(user);
        this.currentUser$.next(user);
      }),
      catchError((error) => {
        DEBUG && console.debug('[AUTH] refreshProfile error', error);
        this.tokenStorage.clear();
        this.currentUser$.next(null);
        return of(null);
      })
    );
  }

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
