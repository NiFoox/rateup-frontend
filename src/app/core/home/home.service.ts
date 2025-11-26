import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Game } from '../games/game.model';
import { ReviewWithUserVote, VoteSummary } from '../reviews/reviews.models';

interface TopGamesResponse {
  limit: number;
  minReviews: number;
  count: number;
  items: Array<
    Game & {
      avgScore?: number;
      reviewCount?: number;
    }
  >;
}

interface TrendingReviewsResponse {
  limit: number;
  days: number;
  count: number;
  items: Array<
    ReviewWithUserVote & {
      voteScore?: number;
    }
  >;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/home`;

  getTopGames(limit = 6, minReviews = 1): Observable<{
    items: Array<Game & { avgScore?: number; reviewCount?: number }>;
    count: number;
    limit: number;
    minReviews: number;
  }> {
    const params = new HttpParams({ fromObject: { limit: String(limit), minReviews: String(minReviews) } });
    return this.http
      .get<TopGamesResponse>(`${this.apiUrl}/top-games`, { params })
      .pipe(map((response) => ({ ...response, items: response.items })));
  }

  getTrendingReviews(limit = 6, days = 7): Observable<ReviewWithUserVote[]> {
    const params = new HttpParams({ fromObject: { limit: String(limit), days: String(days) } });

    return this.http
      .get<TrendingReviewsResponse>(`${this.apiUrl}/trending-reviews`, { params })
      .pipe(
        map((response) =>
          response.items.map((item) => ({
            ...item,
            voteSummary: this.toVoteSummary(
              item.voteSummary ?? {
                score: item.voteScore ?? 0,
                upvotes: item.voteSummary?.upvotes ?? 0,
                downvotes: item.voteSummary?.downvotes ?? 0,
                reviewId: (item as { reviewId?: string; id?: string }).reviewId ?? item.id ?? ''
              }
            ),
            userVote: item.userVote ?? 0
          }))
        )
      );
  }

  private toVoteSummary(summary: Partial<VoteSummary>): VoteSummary {
    return {
      reviewId: String(summary.reviewId ?? ''),
      upvotes: summary.upvotes ?? 0,
      downvotes: summary.downvotes ?? 0,
      score: summary.score ?? 0
    };
  }
}
