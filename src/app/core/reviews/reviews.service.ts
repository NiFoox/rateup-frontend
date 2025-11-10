import { Injectable } from '@angular/core';
import { Observable, defer, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TokenStorage } from '../auth/token-storage';
import { PagedResult, Review, ReviewsQuery } from './reviews.models';
import { REVIEWS_SEED } from './reviews.seed';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type VoteMap = Record<string, -1 | 1>;
type VoteState = -1 | 0 | 1;

const REVIEWS_STORAGE_KEY = 'app.reviews';
const VOTES_STORAGE_PREFIX = 'app.reviewVotes.';

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

const clampPage = (value: number): number => (value < 1 ? 1 : Math.floor(value));

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly storage = resolveStorage();
  private reviews: Review[] = [];
  private memoryVotes = new Map<string, VoteMap>();

  constructor() {
    this.reviews = this.loadReviews();
  }

  list(query: ReviewsQuery): Observable<PagedResult<Review>> {
    const normalized = this.normalizeQuery(query);

    return defer(() => {
      const user = TokenStorage.getUser();
      const votes = this.loadVoteMap(user.id);
      const decorated = this.decorateWithUserVote(this.applyQuery(normalized), votes);
      const total = decorated.length;
      const start = (normalized.page - 1) * normalized.pageSize;
      const end = start + normalized.pageSize;
      const items = decorated.slice(start, end);

      return of({
        items,
        total,
        page: normalized.page,
        pageSize: normalized.pageSize
      });
    }).pipe(delay(this.randomDelay()));
  }

  vote(id: string, delta: -1 | 1): Observable<Review> {
    return defer(() => {
      const index = this.reviews.findIndex((review) => review.id === id);
      if (index === -1) {
        throw new Error('Review not found');
      }

      const user = TokenStorage.getUser();
      const votes = this.loadVoteMap(user.id);
      const review = this.reviews[index];
      const currentVote = votes[id] ?? 0;
      const nextVote: VoteState = currentVote === delta ? 0 : delta;
      const voteDelta = nextVote - currentVote;
      const updatedScore = review.votes + voteDelta;

      const persisted: Review = {
        ...review,
        votes: updatedScore,
        userVote: undefined
      };

      const reviews = [...this.reviews];
      reviews[index] = persisted;
      this.reviews = reviews;
      this.persistReviews();

      if (nextVote === 0) {
        delete votes[id];
      } else {
        votes[id] = nextVote as -1 | 1;
      }
      this.persistVoteMap(user.id, votes);

      const hydrated: Review = {
        ...persisted,
        userVote: nextVote
      };

      return of(hydrated);
    }).pipe(delay(this.randomDelay()));
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
    const pageSize = query.pageSize > 0 ? Math.floor(query.pageSize) : 10;
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

    return filtered.map((review) => ({ ...review }));
  }

  private decorateWithUserVote(reviews: Review[], votes: VoteMap): Review[] {
    return reviews.map((review) => ({
      ...review,
      userVote: votes[review.id] ?? 0
    }));
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
    return 400 + Math.floor(Math.random() * 401);
  }

  private loadReviews(): Review[] {
    const storage = this.storage;
    if (!storage) {
      return REVIEWS_SEED.map((review) => ({ ...review }));
    }

    const raw = storage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) {
      storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(REVIEWS_SEED));
      return REVIEWS_SEED.map((review) => ({ ...review }));
    }

    try {
      const parsed = JSON.parse(raw) as Review[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((review) => ({ ...review, tags: [...review.tags] }));
      }
    } catch {
      // Ignore malformed data and fall back to the seed.
    }

    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(REVIEWS_SEED));
    return REVIEWS_SEED.map((review) => ({ ...review }));
  }

  private persistReviews(): void {
    const storage = this.storage;
    if (!storage) {
      return;
    }

    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(this.reviews));
  }

  private loadVoteMap(userId: string): VoteMap {
    const storage = this.storage;
    if (!storage) {
      return this.memoryVotes.get(userId) ?? {};
    }

    const raw = storage.getItem(`${VOTES_STORAGE_PREFIX}${userId}`);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, VoteState>;
      const validEntries = Object.entries(parsed).reduce<VoteMap>((acc, [key, value]) => {
        if (value === -1 || value === 1) {
          acc[key] = value;
        }
        return acc;
      }, {});
      return validEntries;
    } catch {
      return {};
    }
  }

  private persistVoteMap(userId: string, voteMap: VoteMap): void {
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
}
