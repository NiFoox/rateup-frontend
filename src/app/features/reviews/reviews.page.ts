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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { filter, switchMap } from 'rxjs';

import {
  ReviewFormDialogComponent,
  ReviewFormDialogData,
  ReviewFormDialogResult
} from './components/review-form-dialog';
import {
  ReviewWithUserVote,
  ReviewsQuery,
  VoteValue
} from '../../core/reviews/reviews.models';
import { ReviewsService } from '../../core/reviews/reviews.service';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { AuthService } from '../../core/auth/auth.service';
import { ReviewCard } from './components/review-card';

type VoteDirection = Exclude<VoteValue, 0>;

@Component({
  selector: 'app-reviews-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    ReviewCard
  ],
  templateUrl: './reviews.page.html',
  styleUrl: './reviews.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewsPage implements OnDestroy {
  protected readonly searchCtrl = new FormControl('', { nonNullable: true });

  protected readonly items = signal<ReviewWithUserVote[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(true);
  protected readonly page = signal(1);
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
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private currentQuery: ReviewsQuery = {
    page: 1,
    pageSize: 10
    // search?: string    // se va seteando desde searchCtrl
  };

  private currentRequest?: Subscription;
  private observer?: IntersectionObserver;
  private sentinel?: ElementRef<HTMLDivElement>;

  constructor() {
    this.initializeSearch();
    // primera carga
    this.loadPage(1, false);

    this.route.queryParamMap
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((params) => {
      const userId = params.get('userId');
      const gameId = params.get('gameId');

      this.currentQuery = {
        ...this.currentQuery,
        page: 1,
        userId: userId && userId.trim() !== '' ? userId.trim() : undefined,
        gameId: gameId && gameId.trim() !== '' ? gameId.trim() : undefined
      };

      this.page.set(1);
      this.hasMore.set(true);
      this.loading.set(true);
      this.loadingMore.set(false);
      this.items.set([]);

      this.loadPage(1, false);
    });
  }

  ngOnDestroy(): void {
    this.currentRequest?.unsubscribe();
    this.observer?.disconnect();
  }

  // 🔹 Crear reseña
  protected onCreateReview(): void {
    const dialogRef = this.dialog.open<
      ReviewFormDialogComponent,
      ReviewFormDialogData,
      ReviewFormDialogResult | null
    >(ReviewFormDialogComponent, {
      width: '480px',
      data: {
        mode: 'create'
      }
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is ReviewFormDialogResult => !!result),
        switchMap((result) => this.reviewsService.createReview(result))
      )
      .subscribe({
        next: (created) => {
          this.snackBar.open('Reseña creada correctamente.', 'Cerrar', {
            duration: 3000
          });

          // Nos vamos directo al detalle de la reseña recién creada
          void this.router.navigate(['/reviews', created.id]);
        },
        error: (error) => {
          console.error('[REVIEWS] create error', error);
          this.snackBar.open('No se pudo crear la reseña. Intentá nuevamente.', 'Cerrar', {
            duration: 4000
          });
        }
      });
  }

  // 🔺 Votar
  protected onVote(review: ReviewWithUserVote, direction: VoteDirection): void {
    const snapshot = this.items();
    const index = snapshot.findIndex((item) => item.id === review.id);
    if (index === -1) {
      return;
    }

    const user = this.tokenStorage.getUser();
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

    // Estado optimista
    const optimistic: ReviewWithUserVote = {
      ...previous,
      voteSummary: {
        ...previous.voteSummary,
        score: previous.voteSummary.score + voteDelta,
        upvotes:
          previous.voteSummary.upvotes +
          (nextVote === 1 ? 1 : previousVote === 1 ? -1 : 0),
        downvotes:
          previous.voteSummary.downvotes +
          (nextVote === -1 ? 1 : previousVote === -1 ? -1 : 0)
      },
      userVote: nextVote
    };

    const optimisticItems = [...snapshot];
    optimisticItems[index] = optimistic;
    this.items.set(optimisticItems);

    // Llamada al backend según el caso
    if (nextVote === 0) {
      // Quitar voto => DELETE
      this.reviewsService.deleteVote(review.id).subscribe({
        next: () => {
          // Estado optimista ya aplicado; ahora refrescamos stats del usuario
          this.authService.refreshProfile().subscribe();
        },
        error: (error) => {
          this.items.set(snapshot);
          const message =
            error instanceof Error ? error.message : 'No se pudo eliminar el voto';
          this.snackBar.open(message, 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      // Crear / actualizar voto (-1 o 1)
      this.reviewsService.vote(review.id, nextVote).subscribe({
        next: ({ voteSummary, userVote }) => {
          const current = this.items();
          const currentIndex = current.findIndex((item) => item.id === review.id);
          if (currentIndex === -1) {
            return;
          }
          const merged = [...current];
          merged[currentIndex] = {
            ...current[currentIndex],
            voteSummary,
            userVote
          };
          this.items.set(merged);

          // Después de un voto exitoso, refrescamos stats del usuario
          this.authService.refreshProfile().subscribe();
        },
        error: (error) => {
          this.items.set(snapshot);
          const message =
            error instanceof Error ? error.message : 'No se pudo registrar el voto';
          this.snackBar.open(message, 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  protected loadNextPage(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.loadPage(this.page() + 1, true);
  }

  // Solo búsqueda (search) + recarga de página 1
  private initializeSearch(): void {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((search) => {
        const term = (search ?? '').trim();

        this.currentQuery = {
          ...this.currentQuery,
          page: 1,
          search: term || undefined // si queda vacío, no se manda al backend
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
        const merged = append ? [...this.items(), ...result.data] : result.data;
        this.items.set(merged);
        this.page.set(result.page);

        const hasMore = result.data.length === result.pageSize;
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
        const message =
          error instanceof Error ? error.message : 'No se pudieron cargar las reseñas';
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
