import { Routes } from '@angular/router';
import { GameList } from './features/games/pages/game-list/game-list';
import { ReviewCreate } from './features/reviews/pages/review-create/review-create';

export const routes: Routes = [
  { path: '', redirectTo: 'games', pathMatch: 'full' },
  { path: 'games', component: GameList },
  { path: 'reviews/new', component: ReviewCreate },
];
