import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthResponse, AuthUser, LoginRequest } from './auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);

  readonly currentUser$ = new BehaviorSubject<AuthUser | null>(null);

  login(payload: LoginRequest, rememberMe: boolean): Observable<AuthUser> {
    const url = `${environment.apiBaseUrl}/api/auth/login`;

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap((response) => {
        this.tokenStorage.setTokens(response.accessToken, response.refreshToken, rememberMe);
        this.currentUser$.next(response.user);
      }),
      map((response) => response.user)
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.currentUser$.next(null);
    void this.router.navigateByUrl('/login');
  }
}
