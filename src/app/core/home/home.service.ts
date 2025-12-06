import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ReviewWithUserVote } from '../reviews/reviews.models';
import { Game } from '../games/game.model';

// DTOs según contrato /home/trending-reviews
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

  // Campos extra que se podrían implementar en el backend
  voteSummary?: {
    upvotes: number;
    downvotes: number;
    score: number;
  };
  comments?: number;
  //

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

// DTOs según contrato /home/top-games
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

// Modelo de uso interno en el front para juegos destacados
type TopGameWithStats = Game & {
  avgScore?: number;
  reviewCount?: number;
};

interface TopGamesResult {
  items: TopGameWithStats[];
  count: number;
  limit: number;
  minReviews: number;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/home`;

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
        // si no viene voteSummary, usamos voteScore; si tampoco, 0
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
      // El endpoint /home/trending-reviews NO devuelve userVote.
      // Para la home lo dejamos siempre en 0 (sin voto del usuario actual).
      userVote: 0
    };
  }

  getTopGames(limit = 10, minReviews = 1): Observable<TopGamesResult> {
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
          items: response.items.map<TopGameWithStats>((item) => ({
            id: String(item.id),
            name: item.name,
            // /home/top-games no devuelve description, así que
            // la dejamos vacía para no romper el modelo Game.
            description: '',
            genre: item.genre,
            avgScore: item.avgScore,
            reviewCount: item.reviewCount
          }))
        }))
      );
  }
}
