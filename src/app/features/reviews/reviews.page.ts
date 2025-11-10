import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';

import { ReviewWithUserVote, ReviewsQuery, VoteValue } from '../../core/reviews/reviews.models';
import { ReviewsService } from '../../core/reviews/reviews.service';
import { TokenStorage } from '../../core/auth/token-storage';
import { ReviewCardComponent } from './review-card.component';

type VoteDirection = Exclude<VoteValue, 0>;

type SortOption = 'hot' | 'new' | 'top';

@Component({
  selector: 'app-reviews-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    ReviewCardComponent
  ],
  templateUrl: './reviews.page.html',
  styleUrl: './reviews.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewsPage implements OnDestroy {
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });
  protected readonly tagCtrl = new FormControl('', { nonNullable: true });
  protected readonly gameCtrl = new FormControl('', { nonNullable: true });

  protected readonly items = signal<ReviewWithUserVote[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(true);
  protected readonly sort = signal<SortOption>('hot');
  protected readonly page = signal(1);
  protected readonly tags = signal<string[]>([]);
  protected readonly games = signal<string[]>([]);
  protected readonly skeletons = Array.from({ length: 6 }, (_, index) => index);

  @ViewChild('sentinel')
  private set sentinelRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.sentinel = ref;
    if (ref) {
      this.setupObserver(ref.nativeElement);
    } else {
      this.observer?.disconnect();
      this.observer = undefined;
    }
  }

  private readonly reviewsService = inject(ReviewsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private currentQuery: ReviewsQuery = {
    page: 1,
    pageSize: 10,
    sort: 'hot'
  };
  private currentRequest?: Subscription;
  private observer?: IntersectionObserver;
  private sentinel?: ElementRef<HTMLDivElement>;

  constructor() {
    this.initializeFilters();
    const { tags, games } = this.reviewsService.getAvailableFilters();
    this.tags.set(tags);
    this.games.set(games);
  }

  ngOnDestroy(): void {
    this.currentRequest?.unsubscribe();
    this.observer?.disconnect();
  }

  protected onSortChange(event: MatButtonToggleChange): void {
    const value = event.value as SortOption | null;
    if (value && this.sort() !== value) {
      this.sort.set(value);
    }
  }

  protected onVote(review: ReviewWithUserVote, direction: VoteDirection): void {
    const snapshot = this.items();
    const index = snapshot.findIndex((item) => item.id === review.id);
    if (index === -1) {
      return;
    }

    const user = TokenStorage.getUser();
    if (!user?.id) {
      this.snackBar.open('Necesitas iniciar sesión para votar', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const previous = snapshot[index];
    const previousVote = previous.userVote ?? 0;
    const nextVote: VoteValue = previousVote === direction ? 0 : direction;
    const voteDelta = nextVote - previousVote;

    const optimistic: ReviewWithUserVote = {
      ...previous,
      votes: previous.votes + voteDelta,
      userVote: nextVote
    };

    const optimisticItems = [...snapshot];
    optimisticItems[index] = optimistic;
    this.items.set(optimisticItems);

    this.reviewsService.vote(review.id, direction, user.id).subscribe({
      next: ({ review: updated, userVote }) => {
        const current = this.items();
        const currentIndex = current.findIndex((item) => item.id === updated.id);
        if (currentIndex === -1) {
          return;
        }
        const merged = [...current];
        merged[currentIndex] = {
          ...updated,
          userVote
        };
        this.items.set(merged);
      },
      error: (error) => {
        this.items.set(snapshot);
        const message = error instanceof Error ? error.message : 'No se pudo registrar el voto';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
      }
    });
  }

  protected loadNextPage(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.loadPage(this.page() + 1, true);
  }

  private initializeFilters(): void {
    const sort$ = toObservable(this.sort);
    const search$ = this.searchCtrl.valueChanges.pipe(
      startWith(this.searchCtrl.value),
      debounceTime(300),
      distinctUntilChanged()
    );
    const tag$ = this.tagCtrl.valueChanges.pipe(startWith(this.tagCtrl.value), distinctUntilChanged());
    const game$ = this.gameCtrl.valueChanges.pipe(
      startWith(this.gameCtrl.value),
      distinctUntilChanged()
    );

    combineLatest([search$, tag$, game$, sort$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([search, tag, game, sort]) => {
        this.currentQuery = {
          page: 1,
          pageSize: this.currentQuery.pageSize,
          sort,
          search: search.trim() ? search.trim() : undefined,
          tag: tag.trim() ? tag.trim() : undefined,
          game: game.trim() ? game.trim() : undefined
        };
        this.page.set(1);
        this.hasMore.set(true);
        this.loading.set(true);
        this.loadingMore.set(false);
        this.items.set([]);
        this.loadPage(1, false);
      });
  }

  private loadPage(page: number, append: boolean): void {
    this.currentRequest?.unsubscribe();
    const query: ReviewsQuery = {
      ...this.currentQuery,
      page
    };

    this.currentRequest = this.reviewsService.list(query).subscribe({
      next: (result) => {
        const merged = append ? [...this.items(), ...result.items] : result.items;
        this.items.set(merged);
        this.page.set(result.page);
        const hasMore = result.page * result.pageSize < result.total;
        this.hasMore.set(hasMore);
        this.loading.set(false);
        this.loadingMore.set(false);
        if (!hasMore) {
          this.observer?.disconnect();
        } else if (this.sentinel?.nativeElement) {
          this.setupObserver(this.sentinel.nativeElement);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.loadingMore.set(false);
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las reseñas';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
      }
    });
  }

  private setupObserver(element: HTMLDivElement): void {
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.loadNextPage();
            break;
          }
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 320px 0px',
        threshold: 0.1
      }
    );
    this.observer.observe(element);
  }
}
