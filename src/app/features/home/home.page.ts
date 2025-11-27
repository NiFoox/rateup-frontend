import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/auth/auth.service';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { HomeService } from '../../core/home/home.service';

import { ReviewWithUserVote } from '../../core/reviews/reviews.models';
import { Game } from '../../core/games/game.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatDividerModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage {
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly homeService = inject(HomeService);

  readonly user = toSignal(this.authService.me(), {
    initialValue: this.tokenStorage.getUser()
  });

  readonly topGames = toSignal(
    this.homeService.getTopGames(5, 1),
    {
      initialValue: {
        items: [] as Array<Game & { avgScore?: number; reviewCount?: number }>,
        count: 0,
        limit: 5,
        minReviews: 1
      }
    }
  );

  readonly trendingReviews = toSignal(
    this.homeService.getTrendingReviews(5, 7),
    {
      initialValue: [] as ReviewWithUserVote[]
    }
  );
}
