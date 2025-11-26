import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Comment, PagedResult, Review, ReviewWithUserVote, ReviewsQuery, VoteValue } from './reviews.models';

type VoteResponse = { review: ReviewDto; userVote?: VoteValue | null };

type CommentDto = {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user?: { id: string; username: string };
};

type ReviewDto = {
  id: string;
  gameId: string;
  userId: string;
  content: string;
  score: number;
  createdAt: string;
  updatedAt?: string;
  user?: { id: string; username: string; email?: string };
  game?: { id: string; name: string; genre?: string };
  votes?: number;
  comments?: number;
  userVote?: VoteValue | null;
};

type PagedResultDto<T> = {
  items?: T[];
  data?: T[];
  total?: number;
  count?: number;
  page?: number;
  pageSize?: number;
};

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/reviews`;
  private readonly filters$ = new BehaviorSubject<{ tags: string[]; games: string[] }>({
    tags: [],
    games: []
  });

  list(query: ReviewsQuery): Observable<PagedResult<ReviewWithUserVote>> {
    const params = new HttpParams({
      fromObject: {
        page: String(query.page),
        pageSize: String(query.pageSize),
        gameId: query.gameId ?? '',
        userId: query.userId ?? '',
      }
    });

    return this.http
      .get<PagedResultDto<ReviewDto>>(this.apiUrl, { params })
      .pipe(
        map((result) => this.mapPagedResult(result, (item) => this.mapReview(item))),
        tap((result) => this.updateFilters(result.items))
      );
  }

  getById(id: string): Observable<ReviewWithUserVote> {
    return this.http
      .get<ReviewDto>(`${this.apiUrl}/${id}`)
      .pipe(map((dto) => this.mapReview(dto)));
  }

  vote(reviewId: string, value: VoteValue, _userId?: string): Observable<{
    review: Review;
    userVote: VoteValue;
  }> {
    return this.http
      .post<VoteResponse>(`${this.apiUrl}/${reviewId}/votes`, { value })
      .pipe(
        map((response) => {
          const mapped = this.mapReview(response.review);
          return {
            review: this.withoutUserVote(mapped),
            userVote: this.normalizeVote(response.userVote)
          };
        })
      );
  }

  getComments(reviewId: string, page: number, pageSize: number): Observable<PagedResult<Comment>> {
    const params = new HttpParams({ fromObject: { page: String(page), pageSize: String(pageSize) } });

    return this.http
      .get<PagedResultDto<CommentDto>>(`${this.apiUrl}/${reviewId}/comments`, { params })
      .pipe(map((result) => this.mapPagedResult(result, (item) => this.mapComment(item))));
  }

  addComment(reviewId: string, body: string, _userId?: string, _authorName?: string): Observable<Comment> {
    return this.http
      .post<CommentDto>(`${this.apiUrl}/${reviewId}/comments`, { content: body })
      .pipe(map((dto) => this.mapComment(dto)));
  }

  editComment(
    reviewId: string,
    commentId: string,
    body: string,
    _userId?: string
  ): Observable<Comment> {
    return this.http
      .patch<CommentDto>(`${this.apiUrl}/${reviewId}/comments/${commentId}`, { content: body })
      .pipe(map((dto) => this.mapComment(dto)));
  }

  deleteComment(reviewId: string, commentId: string, _userId?: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${reviewId}/comments/${commentId}`);
  }

  syncCommentCount(_reviewId: string, _total: number): void {
    // The backend is the source of truth for counts; no local cache is maintained.
  }

  getAvailableFilters(): { tags: string[]; games: string[] } {
    const current = this.filters$.value;
    return {
      tags: [...current.tags],
      games: [...current.games]
    };
  }

  private mapPagedResult<TDto, TModel>(dto: PagedResultDto<TDto>, mapItem: (item: TDto) => TModel): PagedResult<TModel> {
    const items = (dto.items ?? dto.data ?? []).map(mapItem);
    const total = dto.total ?? dto.count ?? items.length;

    return {
      items,
      total,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? items.length
    }
  }

  private mapReview(dto: ReviewDto): ReviewWithUserVote {
    return {
      id: String(dto.id),
      gameId: String(dto.gameId),
      userId: String(dto.userId),
      content: dto.content,
      score: dto.score,
      votes: dto.votes ?? 0,
      comments: dto.comments ?? 0,
      game: dto.game
        ? {
            ...dto.game,
            id: String(dto.game.id)
          }
        : undefined,
      user: dto.user
        ? {
            ...dto.user,
            id: String(dto.user.id)
          }
        : undefined,
      createdAt: new Date(dto.createdAt).toISOString(),
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt).toISOString() : undefined,
      userVote: this.normalizeVote(dto.userVote)
    };
  }

  private mapComment(dto: CommentDto): Comment {
    return {
      id: String(dto.id),
      reviewId: String(dto.reviewId),
      authorId: dto.user ? String(dto.user.id) : String(dto.userId),
      authorName: dto.user?.username ?? 'Usuario ' + dto.userId,
      content: dto.content,
      createdAt: new Date(dto.createdAt).toISOString(),
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt).toISOString() : undefined
    };
  }

  private normalizeVote(value: VoteValue | null | undefined): VoteValue {
    if (value === 1 || value === -1 || value === 0) {
      return value;
    }

    return 0;
  }

  private withoutUserVote(review: ReviewWithUserVote): Review {
    const { userVote: _userVote, ...rest } = review;
    return rest;
  }

  private updateFilters(reviews: Review[]): void {
    const current = this.filters$.value;
    const tags = new Set(current.tags);
    const games = new Set(current.games);

    reviews.forEach((review) => {
      if (review.game?.genre) {
        tags.add(review.game.genre);
      }

      if (review.game?.name) {
        games.add(review.game.name);
      }
    });

    const next = {
      tags: Array.from(tags).sort((a, b) => a.localeCompare(b, 'es')),
      games: Array.from(games).sort((a, b) => a.localeCompare(b, 'es'))
    };

    this.filters$.next(next);
  }
}
