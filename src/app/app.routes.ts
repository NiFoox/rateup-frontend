import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    data: { hideToolbar: true },
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage)
  },
  {
    path: 'reviews',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reviews/reviews.page').then((m) => m.ReviewsPage)
  },
  {
    path: 'games',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['editor', 'admin'] },
    loadComponent: () => import('./features/games/games.page').then((m) => m.GamesPage)
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage)
  },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' }
];
