import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'reviews',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reviews/reviews.page').then((m) => m.ReviewsPage)
  },
  { path: '', pathMatch: 'full', redirectTo: 'reviews' },
  { path: '**', redirectTo: 'reviews' }
];
