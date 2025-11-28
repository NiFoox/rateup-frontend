import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, map, distinctUntilChanged, switchMap, catchError } from 'rxjs';

import { ReviewsService } from '../../core/reviews/reviews.service';
import { Comment, ReviewWithUserVote, VoteValue } from '../../core/reviews/reviews.models';
import { CommentFormComponent } from './components/comment-form';
import { CommentListComponent } from './components/comment-list';
import { fromNow } from '../../shared/utils/ui';
import { TokenStorageService } from '../../core/auth/token-storage.service';

type VoteDirection = Exclude<VoteValue, 0>;

@Component({
  selector: 'app-review-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    CommentFormComponent,
    CommentListComponent
  ],
  templateUrl: './review-detail.page.html',
  styleUrl: './review-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewDetailPage {
  @ViewChild(CommentListComponent) private commentList?: CommentListComponent;

  protected readonly review = signal<ReviewWithUserVote | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingVote = signal(false);
  protected readonly relative = fromNow;

  private readonly reviewsService = inject(ReviewsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tokenStorage = inject(TokenStorageService);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => {
          if (!id) {
            this.loading.set(false);
            this.snackBar.open('Reseña no encontrada', 'Cerrar', {
              duration: 3000,
              politeness: 'polite'
            });
            this.router.navigate(['/reviews']);
            return EMPTY;
          }
          this.loading.set(true);
          return this.reviewsService.getFull(id).pipe(
            catchError((error) => {
              this.loading.set(false);
              const message = error instanceof Error ? error.message : 'No se pudo cargar la reseña';
              this.snackBar.open(message, 'Cerrar', { duration: 3000, politeness: 'polite' });
              this.router.navigate(['/reviews']);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.review.set(result.review);
        this.loading.set(false);
      });
  }

  protected vote(direction: VoteDirection): void {
    const current = this.review();
    if (!current || this.loadingVote()) {
      return;
    }

    const user = this.tokenStorage.getUser();
    if (!user?.id) {
      this.snackBar.open('Necesitas iniciar sesión para votar', 'Cerrar', {
        duration: 3000,
        politeness: 'polite'
      });
      return;
    }

    const previousVote = current.userVote ?? 0;
    const nextVote: VoteValue = previousVote === direction ? 0 : direction;
    const voteDelta = nextVote - previousVote;

    const optimistic: ReviewWithUserVote = {
      ...current,
      voteSummary: {
        ...current.voteSummary,
        score: current.voteSummary.score + voteDelta,
        upvotes: current.voteSummary.upvotes + (nextVote === 1 ? 1 : previousVote === 1 ? -1 : 0),
        downvotes: current.voteSummary.downvotes + (nextVote === -1 ? 1 : previousVote === -1 ? -1 : 0)
      },
      userVote: nextVote
    };
    this.review.set(optimistic);
    this.loadingVote.set(true);

    this.reviewsService.vote(current.id, nextVote).subscribe({
      next: ({ voteSummary, userVote }) => {
        this.review.set({ ...current, voteSummary, userVote });
        this.loadingVote.set(false);
      },
      error: (error) => {
        this.review.set(current);
        this.loadingVote.set(false);
        const message = error instanceof Error ? error.message : 'No se pudo registrar el voto';
        this.snackBar.open(message, 'Cerrar', { duration: 3000, politeness: 'polite' });
      }
    });
  }

  protected onCommentCreated(comment: Comment): void {
    if (this.commentList) {
      this.commentList.prepend(comment);
      return;
    }

    const current = this.review();
    if (!current) {
      return;
    }

    const nextTotal = current.comments + 1;
    this.review.set({ ...current, comments: nextTotal });
    this.reviewsService.syncCommentCount(current.id, nextTotal);
  }

  protected onCommentsChanged(): void {
    const list = this.commentList;
    const total = list?.totalCount();
    const current = this.review();
    if (!list || total === undefined || !current) {
      return;
    }

    if (current.comments !== total) {
      this.review.set({ ...current, comments: total });
      this.reviewsService.syncCommentCount(current.id, total);
    }
  }
}
