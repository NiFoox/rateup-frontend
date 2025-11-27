import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Comment,
  PagedResult,
  Review,
  ReviewWithUserVote,
  ReviewsQuery,
  VoteSummary,
  VoteValue
} from './reviews.models';

interface CommentDto {
  id: string;
  reviewId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user?: { id: string; username: string };
  userId?: string;
}

interface ReviewDto {
  id: string;
  gameId: string;
  userId: string;
  content: string;
  score: number;
  createdAt: string;
  updatedAt?: string;
  user?: { id: string; username: string; email?: string };
  game?: { id: string; name: string; genre?: string };
  voteScore?: number;
}

interface ReviewWithRelationsDto extends ReviewDto {
  game: { id: string; name: string; genre: string };
  user: { id: string; username: string; email?: string };
}

interface VoteSummaryDto {
  reviewId: string;
  upvotes: number;
  downvotes: number;
  score: number;
}

interface CommentsPageDto<T> {
  page: number;
  pageSize: number;
  data?: T[];
  items?: T[];
  count?: number;
  total?: number;
}

interface ReviewFullDto {
  reviewId: string;
  review: ReviewWithRelationsDto;
  comments: CommentsPageDto<CommentDto>;
  votes: VoteSummaryDto;
}

interface TrendingReviewsDto {
  limit: number;
  days: number;
  count: number;
  items: Array<
    ReviewWithRelationsDto & {
      voteScore?: number;
    }
  >;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/reviews`;
  private readonly homeUrl = `${environment.apiBaseUrl}/api/home`;
  private readonly filters$ = new BehaviorSubject<{ tags: string[]; games: string[] }>({
    tags: [],
    games: []
  });

  list(query: ReviewsQuery): Observable<PagedResult<ReviewWithUserVote>> {
    const params = new HttpParams({
      fromObject: {
        limit: String(query.pageSize ?? 10),
        days: query.days ? String(query.days) : ''
      }
    });

    return this.http
      .get<TrendingReviewsDto>(`${this.homeUrl}/trending-reviews`, { params })
      .pipe(map((response) => this.mapTrending(response)));
  }

  getById(id: string): Observable<ReviewWithUserVote> {
    return this.http
      .get<ReviewWithRelationsDto>(`${this.apiUrl}/${id}/details`)
      .pipe(map((dto) => this.mapReview(dto, 0)));
  }

  getFull(id: string, commentsPage = 1, commentsPageSize = 10): Observable<{
    review: ReviewWithUserVote;
    comments: PagedResult<Comment>;
  }> {
    const params = new HttpParams({
      fromObject: {
        commentsPage: String(commentsPage),
        commentsPageSize: String(commentsPageSize)
      }
    });

    return this.http.get<ReviewFullDto>(`${this.apiUrl}/${id}/full`, { params }).pipe(
      map((dto) => {
        const review = this.mapReview(dto.review, 0, dto.votes);
        const comments = this.mapCommentsPage(dto.comments);
        review.comments = comments.total;
        return { review, comments };
      })
    );
  }

  getVotes(reviewId: string): Observable<VoteSummary> {
    return this.http
      .get<VoteSummaryDto>(`${this.apiUrl}/${reviewId}/votes`)
      .pipe(map((dto) => this.mapVoteSummary(dto)));
  }

  vote(
    reviewId: string,
    value: VoteValue
  ): Observable<{ voteSummary: VoteSummary; userVote: VoteValue }> {
    return this.http
      .put<VoteSummaryDto>(`${this.apiUrl}/${reviewId}/votes`, { value })
      .pipe(map((dto) => ({ voteSummary: this.mapVoteSummary(dto), userVote: value })));
  }

  deleteVote(reviewId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${reviewId}/votes`);
  }

  getComments(reviewId: string, page: number, pageSize: number): Observable<PagedResult<Comment>> {
    const params = new HttpParams({ fromObject: { page: String(page), pageSize: String(pageSize) } });

    return this.http
      .get<CommentsPageDto<CommentDto>>(`${this.apiUrl}/${reviewId}/comments/details`, { params })
      .pipe(map((result) => this.mapCommentsPage(result)));
  }

  addComment(reviewId: string, body: string): Observable<Comment> {
    return this.http
      .post<CommentDto>(`${this.apiUrl}/${reviewId}/comments`, { content: body })
      .pipe(map((dto) => this.mapComment(dto)));
  }

  editComment(reviewId: string, commentId: string, body: string): Observable<Comment> {
    return this.http
      .patch<CommentDto>(`${this.apiUrl}/${reviewId}/comments/${commentId}`, { content: body })
      .pipe(map((dto) => this.mapComment(dto)));
  }

  deleteComment(reviewId: string, commentId: string): Observable<void> {
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

  private mapTrending(response: TrendingReviewsDto): PagedResult<ReviewWithUserVote> {
    const items = response.items.map((item) =>
      this.mapReview(item, 0, { score: item.voteScore ?? 0, upvotes: 0, downvotes: 0, reviewId: item.id })
    );
    const result = {
      items,
      total: response.count ?? items.length,
      page: 1,
      pageSize: response.limit ?? items.length
    } satisfies PagedResult<ReviewWithUserVote>;

    this.updateFilters(items);
    return result;
  }

  private mapCommentsPage(dto: CommentsPageDto<CommentDto>): PagedResult<Comment> {
    const items = (dto.items ?? dto.data ?? []).map((item) => this.mapComment(item));
    const total = dto.count ?? dto.total ?? items.length;

    return {
      items,
      total,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? items.length
    };
  }

  private mapReview(
    dto: ReviewDto,
    userVote: VoteValue,
    voteSummary?: VoteSummaryDto
  ): ReviewWithUserVote {
    const review: ReviewWithUserVote = {
      id: String(dto.id),
      gameId: String(dto.gameId),
      userId: String(dto.userId),
      content: dto.content,
      score: dto.score,
      comments: 0,
      createdAt: new Date(dto.createdAt).toISOString(),
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt).toISOString() : undefined,
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
      voteSummary: this.mapVoteSummary(
        voteSummary ?? {
          reviewId: String(dto.id),
          upvotes: 0,
          downvotes: 0,
          score: dto.voteScore ?? 0
        }
      ),
      userVote: this.normalizeVote(userVote)
    } satisfies ReviewWithUserVote;

    return review;
  }

  private mapComment(dto: CommentDto): Comment {
    const user = dto.user;
    return {
      id: String(dto.id),
      reviewId: String(dto.reviewId),
      authorId: user ? String(user.id) : String(dto.userId ?? ''),
      authorName: user?.username ?? `Usuario ${dto.userId ?? ''}`,
      content: dto.content,
      createdAt: new Date(dto.createdAt).toISOString(),
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt).toISOString() : undefined
    } satisfies Comment;
  }

  private mapVoteSummary(dto: VoteSummaryDto): VoteSummary {
    return {
      reviewId: String(dto.reviewId),
      upvotes: dto.upvotes ?? 0,
      downvotes: dto.downvotes ?? 0,
      score: dto.score ?? 0
    } satisfies VoteSummary;
  }

  private normalizeVote(value: VoteValue | null | undefined): VoteValue {
    if (value === 1 || value === -1 || value === 0) {
      return value;
    }

    return 0;
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
