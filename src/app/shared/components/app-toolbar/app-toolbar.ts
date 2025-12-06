<<<<<<< HEAD
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/auth/auth.service';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { AuthUser } from '../../../core/auth/auth.models';

@Component({
  selector: 'app-app-toolbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './app-toolbar.html',
  styleUrl: './app-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppToolbar {
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);

  readonly user = toSignal(this.authService.me(), {
    initialValue: this.resolveInitialUser()
  });

  private resolveInitialUser(): AuthUser | null {
    return this.tokenStorage.getUser();
  }

  hasRole(role: string): boolean {
    const currentUser = this.user();

    if (!currentUser) {
      return false;
    }

    return (currentUser.roles as string[]).includes(role);
  }

  onLogoutClick(): void {
    const confirmed = window.confirm('¿Seguro que querés cerrar sesión?');

    if (!confirmed) {
      return;
    }

    this.authService.logout();
  }
}
=======
import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, RouterModule],
  templateUrl: './app-toolbar.html',
  styleUrls: ['./app-toolbar.scss'],
})
export class AppToolbar {}
>>>>>>> develop
