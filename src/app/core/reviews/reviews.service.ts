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

import {
  CommentDto,
  ReviewDto,
  ReviewWithRelationsDto,
  VoteSummaryDto,
  CommentsPageDto,
  ReviewFullDto
} from './reviews.dto';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/reviews`;

  createReview(body: { gameId: string; content: string; score: number }): Observable<ReviewWithUserVote> {
    return this.http
      .post<ReviewDto>(this.apiUrl, {
        gameId: Number(body.gameId),
        content: body.content,
        score: body.score
      })
      .pipe(map((dto) => this.mapReview(dto, 0)));
  }

  list(query: ReviewsQuery): Observable<PagedResult<ReviewWithUserVote>> {
    const params = new HttpParams({
      fromObject: {
        page: String(query.page || 1),
        pageSize: String(query.pageSize || 10),
        ...(query.gameId ? { gameId: query.gameId } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.search ? { search: query.search } : {}),
      }
    });

    return this.http
      .get<PagedResult<ReviewDto>>(this.apiUrl, { params }) 
      .pipe(map((response) => this.mapPagedReviews(response)));
  }

  listMine(query: ReviewsQuery): Observable<PagedResult<ReviewWithUserVote>> {
    const params = new HttpParams({
      fromObject: {
        page: String(query.page || 1),
        pageSize: String(query.pageSize || 10),
        ...(query.gameId ? { gameId: query.gameId } : {}),
        ...(query.search ? { search: query.search } : {})
      }
    });

    return this.http
      .get<PagedResult<ReviewDto>>(`${this.apiUrl}/me`, { params })
      .pipe(map((dto) => this.mapPagedReviews(dto)));
  }

  getById(id: string): Observable<ReviewWithUserVote> {
    return this.http
      .get<ReviewWithRelationsDto>(`${this.apiUrl}/${id}/details`)
      .pipe(map((dto) => this.mapReview(dto, this.normalizeVote((dto.userVote ?? 0) as VoteValue))));
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
        const review = this.mapReview(dto.review, this.normalizeVote((dto.userVote ?? 0) as VoteValue), dto.votes);
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

  updateReview(
    id: string,
    body: { content?: string; score?: number }
  ): Observable<ReviewWithUserVote> {
    return this.http
      .patch<ReviewDto>(`${this.apiUrl}/${id}`, body)
      .pipe(map((dto) => this.mapReview(dto, 0)));
  }

  deleteReview(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  vote(
    reviewId: string,
    value: 1 | -1
  ): Observable<{ voteSummary: VoteSummary; userVote: VoteValue }> {
    return this.http
      .post<VoteSummaryDto>(`${this.apiUrl}/${reviewId}/votes`, { value })
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

  private mapPagedReviews(dto: PagedResult<ReviewDto>): PagedResult<ReviewWithUserVote> {
    const data = (dto.data ?? []).map((item) =>
      this.mapReview(item, this.normalizeVote((item.userVote ?? 0) as VoteValue))
    );

    return {
      data,
      total: dto.total ?? data.length,
      page: dto.page,
      pageSize: dto.pageSize
    };
  }

  private mapCommentsPage(dto: CommentsPageDto<CommentDto>): PagedResult<Comment> {
    const items = (dto.items ?? dto.data ?? []).map((item) => this.mapComment(item));
    const total = dto.count ?? dto.total ?? items.length;

    return {
      data: items,
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
    const summaryToUse =
      voteSummary ??
      dto.votes ?? {
        reviewId: String(dto.id),
        upvotes: 0,
        downvotes: 0,
        score: 0
      };

    const review: ReviewWithUserVote = {
      id: String(dto.id),
      gameId: String(dto.gameId),
      userId: String(dto.userId),
      content: dto.content,
      score: dto.score,
      comments: dto.comments ?? 0,
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
      voteSummary: this.mapVoteSummary(summaryToUse),
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
}
