import { Routes } from '@angular/router';
import { GameList } from './features/games/pages/game-list/game-list';
import { ReviewCreate } from './features/reviews/pages/review-create/review-create';

<<<<<<< HEAD
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    data: { hideToolbar: true },
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage)
  },
  {
    path: 'reviews/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reviews/review-detail.page').then((m) => m.ReviewDetailPage)
  },
  {
    path: 'reviews',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reviews/reviews.page').then((m) => m.ReviewsPage)
  },
  {
    path: 'games',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'USER'] },
    loadComponent: () => import('./features/games/games.page').then((m) => m.GamesPage)
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/users/users.page').then((m) => m.UsersComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.page').then((m) => m.ProfilePage)
  },
  {
    path: 'profile/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/public-profile.page').then(
        (m) => m.PublicProfilePage
      )
  },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' }
=======
export const routes: Routes = [
  { path: '', redirectTo: 'games', pathMatch: 'full' },
  { path: 'games', component: GameList },
  { path: 'reviews/new', component: ReviewCreate },
>>>>>>> develop
];
