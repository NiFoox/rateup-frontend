import { Injectable } from '@angular/core';
import { Observable, defer, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { TokenStorage } from '../auth/token-storage';
import {
  Comment,
  PagedResult,
  Review,
  ReviewWithUserVote,
  ReviewsQuery,
  VoteValue
} from './reviews.models';
import { REVIEWS_SEED } from './reviews.seed';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type VoteMap = Record<string, VoteValue>;

const DEBUG = false;

const REVIEWS_STORAGE_KEY = 'app.reviews';
const VOTES_STORAGE_PREFIX = 'app.reviewVotes.';
const COMMENTS_STORAGE_PREFIX = 'app.comments.';

const resolveStorage = (): StorageLike | null => {
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage;
    }
  } catch {
    // Ignore environments where localStorage is not available.
  }
  return null;
};

const clampPage = (value: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
};

const normalizePageSize = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 10;
  }
  return Math.floor(value);
};

const cloneReview = (review: Review): Review => ({
  ...review,
  tags: [...review.tags]
});

const cloneComment = (comment: Comment): Comment => ({ ...comment });

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `comment-${Math.random().toString(36).slice(2, 11)}-${Date.now()}`;
};

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly storage = resolveStorage();
  private reviews: Review[] = [];
  private memoryVotes = new Map<string, VoteMap>();
  private memoryComments = new Map<string, Comment[]>();

  constructor() {
    this.reviews = this.loadReviews();
  }

  list(query: ReviewsQuery): Observable<PagedResult<ReviewWithUserVote>> {
    const normalized = this.normalizeQuery(query);

    return defer(() => {
      const user = TokenStorage.getUser();
      const userId = user?.id ?? '';
      const votes = userId ? this.loadVoteMap(userId) : {};
      const filtered = this.applyQuery(normalized);
      const total = filtered.length;
      const start = (normalized.page - 1) * normalized.pageSize;
      const end = start + normalized.pageSize;
      const slice = filtered.slice(start, end);
      const items = slice.map((review) => this.decorateReview(review, votes));

      const result: PagedResult<ReviewWithUserVote> = {
        items,
        total,
        page: normalized.page,
        pageSize: normalized.pageSize
      };

      return of(result);
    }).pipe(delay(this.randomDelay()));
  }

  getById(id: string): Observable<ReviewWithUserVote> {
    return defer(() => {
      const review = this.reviews.find((item) => item.id === id);
      if (!review) {
        throw new Error('Review no encontrada');
      }

      const user = TokenStorage.getUser();
      const userId = user?.id ?? '';
      const votes = userId ? this.loadVoteMap(userId) : {};
      const decorated = this.decorateReview(review, votes);
      return of(decorated);
    }).pipe(delay(this.randomDelay()));
  }

  vote(reviewId: string, value: VoteValue, userId: string): Observable<{
    review: Review;
    userVote: VoteValue;
  }> {
    return defer(() => {
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const index = this.reviews.findIndex((item) => item.id === reviewId);
      if (index === -1) {
        throw new Error('Review no encontrada');
      }

      const votes = this.loadVoteMap(userId);
      const current = votes[reviewId] ?? 0;
      const next: VoteValue = current === value ? 0 : value;
      const delta = next - current;

      const target = this.reviews[index];
      const updated: Review = {
        ...target,
        votes: target.votes + delta
      };

      this.reviews = [...this.reviews];
      this.reviews[index] = updated;
      this.persistReviews();

      if (next === 0) {
        delete votes[reviewId];
      } else {
        votes[reviewId] = next;
      }
      this.persistVoteMap(userId, votes);

      return of({
        review: cloneReview(updated),
        userVote: next
      });
    }).pipe(delay(this.randomDelay()));
  }

  getComments(reviewId: string, page: number, pageSize: number): Observable<PagedResult<Comment>> {
    const normalizedPage = clampPage(page);
    const normalizedSize = normalizePageSize(pageSize);

    return defer(() => {
      const comments = this.readComments(reviewId);
      const sorted = [...comments].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
      const start = (normalizedPage - 1) * normalizedSize;
      const end = start + normalizedSize;
      const items = sorted.slice(start, end).map(cloneComment);

      const result: PagedResult<Comment> = {
        items,
        total: sorted.length,
        page: normalizedPage,
        pageSize: normalizedSize
      };

      return of(result);
    }).pipe(delay(this.randomDelay()));
  }

  addComment(
    reviewId: string,
    body: string,
    userId: string,
    authorName: string
  ): Observable<Comment> {
    return defer(() => {
      const trimmed = body.trim();
      if (trimmed.length < 2) {
        throw new Error('El comentario es demasiado corto');
      }
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const reviewIndex = this.reviews.findIndex((item) => item.id === reviewId);
      if (reviewIndex === -1) {
        throw new Error('Review no encontrada');
      }

      const now = new Date().toISOString();
      const comment: Comment = {
        id: generateId(),
        reviewId,
        authorId: userId,
        authorName,
        body: trimmed,
        createdAt: now
      };

      const comments = [comment, ...this.readComments(reviewId)];
      this.writeComments(reviewId, comments);
      this.updateReviewCommentsCount(reviewId, 1);

      this.logDebug('Comment added', { reviewId, commentId: comment.id });

      return of(cloneComment(comment));
    }).pipe(delay(this.randomDelay()));
  }

  editComment(
    reviewId: string,
    commentId: string,
    body: string,
    userId: string
  ): Observable<Comment> {
    return defer(() => {
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }
      const trimmed = body.trim();
      if (trimmed.length < 2) {
        throw new Error('El comentario es demasiado corto');
      }

      const comments = this.readComments(reviewId);
      const index = comments.findIndex((comment) => comment.id === commentId);
      if (index === -1) {
        throw new Error('Comentario no encontrado');
      }

      const target = comments[index];
      if (target.authorId !== userId) {
        throw new Error('No autorizado');
      }

      const updated: Comment = {
        ...target,
        body: trimmed,
        updatedAt: new Date().toISOString()
      };

      const nextComments = [...comments];
      nextComments[index] = updated;
      this.writeComments(reviewId, nextComments);

      this.logDebug('Comment edited', { reviewId, commentId });

      return of(cloneComment(updated));
    }).pipe(delay(this.randomDelay()));
  }

  deleteComment(reviewId: string, commentId: string, userId: string): Observable<void> {
    return defer(() => {
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const comments = this.readComments(reviewId);
      const index = comments.findIndex((comment) => comment.id === commentId);
      if (index === -1) {
        throw new Error('Comentario no encontrado');
      }

      const target = comments[index];
      const currentUser = TokenStorage.getUser();
      const isAdmin = currentUser?.roles?.includes('admin');
      if (target.authorId !== userId && !isAdmin) {
        throw new Error('No autorizado');
      }

      const nextComments = [...comments];
      nextComments.splice(index, 1);
      this.writeComments(reviewId, nextComments);
      this.updateReviewCommentsCount(reviewId, -1);

      this.logDebug('Comment deleted', { reviewId, commentId });

      return of(void 0);
    }).pipe(delay(this.randomDelay()));
  }

  syncCommentCount(reviewId: string, total: number): void {
    const index = this.reviews.findIndex((item) => item.id === reviewId);
    if (index === -1) {
      return;
    }

    const normalized = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
    const target = this.reviews[index];
    if (target.comments === normalized) {
      return;
    }

    this.reviews = [...this.reviews];
    this.reviews[index] = {
      ...target,
      comments: normalized
    };
    this.persistReviews();

    this.logDebug('Comment count synced', { reviewId, total: normalized });
  }

  getAvailableFilters(): { tags: string[]; games: string[] } {
    const tagSet = new Set<string>();
    const gameSet = new Set<string>();

    for (const review of this.reviews) {
      review.tags.forEach((tag) => tagSet.add(tag));
      gameSet.add(review.game);
    }

    const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'es'));
    const games = Array.from(gameSet).sort((a, b) => a.localeCompare(b, 'es'));

    return { tags, games };
  }

  private normalizeQuery(query: ReviewsQuery): ReviewsQuery {
    const pageSize = normalizePageSize(query.pageSize);
    const normalized: ReviewsQuery = {
      page: clampPage(query.page),
      pageSize,
      sort: query.sort ?? 'hot'
    };

    if (query.search?.trim()) {
      normalized.search = query.search.trim();
    }
    if (query.tag?.trim()) {
      normalized.tag = query.tag.trim();
    }
    if (query.game?.trim()) {
      normalized.game = query.game.trim();
    }

    return normalized;
  }

  private applyQuery(query: ReviewsQuery): Review[] {
    const search = query.search?.toLocaleLowerCase('es');
    const tag = query.tag?.toLocaleLowerCase('es');
    const game = query.game?.toLocaleLowerCase('es');

    let filtered = this.reviews.filter((review) => {
      const matchesSearch = !search
        || review.title.toLocaleLowerCase('es').includes(search)
        || review.body.toLocaleLowerCase('es').includes(search)
        || review.game.toLocaleLowerCase('es').includes(search)
        || review.authorName.toLocaleLowerCase('es').includes(search);

      const matchesTag = !tag
        || review.tags.some((t) => t.toLocaleLowerCase('es') === tag);

      const matchesGame = !game || review.game.toLocaleLowerCase('es') === game;

      return matchesSearch && matchesTag && matchesGame;
    });

    filtered = this.sortReviews(filtered, query.sort ?? 'hot');

    return filtered.map(cloneReview);
  }

  private decorateReview(review: Review, votes: VoteMap): ReviewWithUserVote {
    const userVote = votes[review.id] ?? 0;
    return {
      ...cloneReview(review),
      userVote
    };
  }

  private sortReviews(reviews: Review[], sort: 'hot' | 'new' | 'top'): Review[] {
    switch (sort) {
      case 'new':
        return [...reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      case 'top':
        return [...reviews].sort((a, b) => b.votes - a.votes);
      case 'hot':
      default:
        return [...reviews].sort((a, b) => this.computeHotScore(b) - this.computeHotScore(a));
    }
  }

  private computeHotScore(review: Review): number {
    const ageHours = (Date.now() - Date.parse(review.createdAt)) / (1000 * 60 * 60);
    return review.votes / Math.pow(ageHours + 2, 1.5);
  }

  private randomDelay(): number {
    return 300 + Math.floor(Math.random() * 401);
  }

  private loadReviews(): Review[] {
    const storage = this.storage;
    if (!storage) {
      return REVIEWS_SEED.map(cloneReview);
    }

    const raw = storage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) {
      storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(REVIEWS_SEED));
      return REVIEWS_SEED.map(cloneReview);
    }

    try {
      const parsed = JSON.parse(raw) as Review[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(cloneReview);
      }
    } catch {
      // Ignore malformed data and fall back to the seed.
    }

    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(REVIEWS_SEED));
    return REVIEWS_SEED.map(cloneReview);
  }

  private persistReviews(): void {
    const storage = this.storage;
    if (!storage) {
      return;
    }

    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(this.reviews));
  }

  private loadVoteMap(userId: string): VoteMap {
    if (!userId) {
      return {};
    }

    const storage = this.storage;
    if (!storage) {
      return this.memoryVotes.get(userId) ?? {};
    }

    const raw = storage.getItem(`${VOTES_STORAGE_PREFIX}${userId}`);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as VoteMap;
      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed).reduce<VoteMap>((acc, [key, value]) => {
          if (value === -1 || value === 0 || value === 1) {
            acc[key] = value;
          }
          return acc;
        }, {});
      }
    } catch {
      // Ignore malformed vote maps.
    }

    return {};
  }

  private persistVoteMap(userId: string, voteMap: VoteMap): void {
    if (!userId) {
      return;
    }

    const storage = this.storage;
    if (!storage) {
      if (Object.keys(voteMap).length === 0) {
        this.memoryVotes.delete(userId);
      } else {
        this.memoryVotes.set(userId, voteMap);
      }
      return;
    }

    const key = `${VOTES_STORAGE_PREFIX}${userId}`;
    if (Object.keys(voteMap).length === 0) {
      storage.removeItem(key);
      return;
    }

    storage.setItem(key, JSON.stringify(voteMap));
  }

  private logDebug(message: string, context?: Record<string, unknown>): void {
    if (DEBUG) {
      const payload = context ? JSON.stringify(context) : '';
      const suffix = payload ? ` ${payload}` : '';
      console.debug(`[ReviewsService] ${message}${suffix}`);
    }
  }

  private readComments(reviewId: string): Comment[] {
    if (!reviewId) {
      return [];
    }

    const storage = this.storage;
    if (!storage) {
      const fallback = this.memoryComments.get(reviewId)?.map(cloneComment) ?? [];
      this.logDebug('Read comments (memory)', { reviewId, count: fallback.length });
      return fallback;
    }

    const raw = storage.getItem(`${COMMENTS_STORAGE_PREFIX}${reviewId}`);
    if (!raw) {
      this.logDebug('Read comments (storage miss)', { reviewId, count: 0 });
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Comment[];
      if (Array.isArray(parsed)) {
        const mapped = parsed.map(cloneComment);
        this.logDebug('Read comments (storage)', { reviewId, count: mapped.length });
        return mapped;
      }
    } catch {
      // Ignore malformed data.
    }

    this.logDebug('Read comments (storage invalid)', { reviewId, count: 0 });
    return [];
  }

  private writeComments(reviewId: string, comments: Comment[]): void {
    if (!reviewId) {
      return;
    }

    const storage = this.storage;
    if (!storage) {
      if (comments.length === 0) {
        this.memoryComments.delete(reviewId);
      } else {
        this.memoryComments.set(reviewId, comments.map(cloneComment));
      }
      this.logDebug('Write comments (memory)', { reviewId, count: comments.length });
      return;
    }

    const key = `${COMMENTS_STORAGE_PREFIX}${reviewId}`;
    if (comments.length === 0) {
      storage.removeItem(key);
      this.logDebug('Write comments (storage remove)', { reviewId, count: 0 });
      return;
    }

    storage.setItem(key, JSON.stringify(comments));
    this.logDebug('Write comments (storage)', { reviewId, count: comments.length });
  }

  private updateReviewCommentsCount(reviewId: string, delta: number): void {
    const index = this.reviews.findIndex((item) => item.id === reviewId);
    if (index === -1) {
      return;
    }

    const target = this.reviews[index];
    const nextTotal = Math.max(0, target.comments + delta);
    if (nextTotal === target.comments) {
      return;
    }

    this.reviews = [...this.reviews];
    this.reviews[index] = {
      ...target,
      comments: nextTotal
    };
    this.persistReviews();

    this.logDebug('Review comments count updated', { reviewId, delta, total: nextTotal });
  }
}
