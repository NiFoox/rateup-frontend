import { Routes } from '@angular/router';
import { GameList } from './features/games/pages/game-list/game-list';
import { ReviewCreate } from './features/reviews/pages/review-create/review-create';
import { Home } from './features/home/pages/home/home';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'games', component: GameList },
  { path: 'reviews/new', component: ReviewCreate },
  { path: 'home', component: Home}
];
