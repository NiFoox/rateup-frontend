import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth/auth.service';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { PrivateUserProfile } from '../../core/auth/auth.models';
import { HomeService } from '../../core/home/home.service';
import { ReviewWithUserVote } from '../../core/reviews/reviews.models';
import { Game } from '../../core/games/game.model';

import { TopGameCardComponent } from './components/top-game-card';

type TopGameWithStats = Game & {
  avgScore?: number;
  reviewCount?: number;
};

interface HomeTopGamesState {
  items: TopGameWithStats[];
  count: number;
  limit: number;
  minReviews: number;
}

type UserLike = PrivateUserProfile | null;

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    TopGameCardComponent
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage {
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService); // por si después lo querés usar
  private readonly homeService = inject(HomeService);

  // Signal: PrivateUserProfile | null
  readonly user = toSignal(this.authService.me(), {
    initialValue: null as UserLike
  });

  readonly isLoggedIn = computed(() => this.user() !== null);

  readonly topGames = toSignal(
    this.homeService.getTopGames(5, 1),
    {
      initialValue: {
        items: [] as TopGameWithStats[],
        count: 0,
        limit: 5,
        minReviews: 1
      } satisfies HomeTopGamesState
    }
  );

  readonly trendingReviews = toSignal(
    this.homeService.getTrendingReviews(5, 7),
    {
      initialValue: [] as ReviewWithUserVote[]
    }
  );
}
