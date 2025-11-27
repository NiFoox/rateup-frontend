import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ReviewWithUserVote } from '../reviews/reviews.models';
import { Game } from '../games/game.model';

interface TrendingReviewsResponseDto {
  limit: number;
  days: number;
  count: number;
  items: TrendingReviewItemDto[];
}

interface TrendingReviewItemDto {
  id: number;
  content: string;
  score: number;
  createdAt: string;
  voteScore?: number;
  voteSummary?: {
    upvotes: number;
    downvotes: number;
    score: number;
  };
  comments?: number;
  user: {
    id: number;
    username: string;
    email?: string;
  };
  game: {
    id: number;
    name: string;
    genre: string;
  };
}

/** DTOs para top-games según el contrato */
interface TopGamesResponseDto {
  limit: number;
  minReviews: number;
  count: number;
  items: TopGameItemDto[];
}

interface TopGameItemDto {
  id: number;
  name: string;
  genre: string;
  avgScore: number;
  reviewCount: number;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/home`;

  /** GET /home/trending-reviews */
  getTrendingReviews(limit = 10, days = 7): Observable<ReviewWithUserVote[]> {
    const params = new HttpParams({
      fromObject: {
        limit: String(limit),
        days: String(days)
      }
    });

    return this.http
      .get<TrendingReviewsResponseDto>(`${this.apiUrl}/trending-reviews`, { params })
      .pipe(map((response) => response.items.map((item) => this.mapTrendingReview(item))));
  }

  private mapTrendingReview(item: TrendingReviewItemDto): ReviewWithUserVote {
    return {
      id: String(item.id),
      gameId: String(item.game.id),
      userId: String(item.user.id),
      content: item.content,
      score: item.score,
      createdAt: item.createdAt,
      updatedAt: undefined,
      voteSummary: {
        reviewId: String(item.id),
        upvotes: item.voteSummary?.upvotes ?? 0,
        downvotes: item.voteSummary?.downvotes ?? 0,
        score: item.voteSummary?.score ?? item.voteScore ?? 0
      },
      comments: item.comments ?? 0,
      game: {
        id: String(item.game.id),
        name: item.game.name,
        genre: item.game.genre
      },
      user: {
        id: String(item.user.id),
        username: item.user.username,
        email: item.user.email
      },
      userVote: 0
    };
  }

  /** GET /home/top-games */
  getTopGames(
    limit = 10,
    minReviews = 1
  ): Observable<{
    items: Array<Game & { avgScore?: number; reviewCount?: number }>;
    count: number;
    limit: number;
    minReviews: number;
  }> {
    const params = new HttpParams({
      fromObject: {
        limit: String(limit),
        minReviews: String(minReviews)
      }
    });

    return this.http
      .get<TopGamesResponseDto>(`${this.apiUrl}/top-games`, { params })
      .pipe(
        map((response) => ({
          limit: response.limit,
          minReviews: response.minReviews,
          count: response.count,
          items: response.items.map((item) => ({
            id: String(item.id),
            name: item.name,
            // si el Game tiene description setear '' opcionalmente
            description: '',
            genre: item.genre,
            avgScore: item.avgScore,
            reviewCount: item.reviewCount
          }))
        }))
      );
  }
}
