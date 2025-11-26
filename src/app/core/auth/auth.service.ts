import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap } from 'rxjs';

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
  private profileLoaded = this.tokenStorage.isAuthenticated() && !!this.tokenStorage.getUser();

  readonly currentUser$ = new BehaviorSubject<AuthUser | null>(
    this.tokenStorage.isAuthenticated() ? this.tokenStorage.getUser() : null
  );

  login(request: LoginRequest): Observable<AuthResponse> {
    const remember = request.rememberMe ?? false;
    const endpoint = `${this.apiBaseUrl}/api/auth/login`;
    DEBUG && console.debug('[AUTH] login → POST', { endpoint, remember });

    return this.http.post<AuthResponse>(endpoint, request).pipe(
      tap((response) => {
        DEBUG && console.debug('[AUTH] login response', { hasAccessToken: !!response?.accessToken });
        if (!response?.accessToken || !response?.user) {
          throw new Error('INVALID_PAYLOAD');
        }

        this.tokenStorage.setTokens(response.accessToken, remember);
        this.tokenStorage.setUser(response.user);
        this.currentUser$.next(response.user);
        this.profileLoaded = true;
        DEBUG && console.debug('[AUTH] tokens+user stored', { user: response.user.email });
      })
    );
  }

  logout(): void {
    this.profileLoaded = false;
    this.tokenStorage.clear();
    this.currentUser$.next(null);
    void this.router.navigateByUrl('/login');
  }

  me(): Observable<AuthUser | null> {
    if (this.tokenStorage.isAuthenticated() && !this.profileLoaded) {
      this.profileLoaded = true;
      this.http
        .get<PrivateUserProfile>(`${this.apiBaseUrl}/api/auth/me`)
        .pipe(
          tap((user) => {
            this.tokenStorage.setUser(user);
            this.currentUser$.next(user);
          }),
          catchError(() => {
            this.tokenStorage.clear();
            this.currentUser$.next(null);
            return of(null);
          })
        )
        .subscribe();
    }

    return this.currentUser$.asObservable();
  }
}
