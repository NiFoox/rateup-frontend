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
import { CommentFormComponent } from './comment-form.component';
import { CommentListComponent } from './comment-list.component';
import { fromNow } from '../../shared/utils/ui';
import { TokenStorage } from '../../core/auth/token-storage';

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
  styleUrls: ['./review-detail.page.scss'],
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

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => {
          if (!id) {
            this.loading.set(false);
            this.snackBar.open('Reseña no encontrada', 'Cerrar', { duration: 3000 });
            this.router.navigate(['/reviews']);
            return EMPTY;
          }
          this.loading.set(true);
          return this.reviewsService.getById(id).pipe(
            catchError((error) => {
              this.loading.set(false);
              const message = error instanceof Error ? error.message : 'No se pudo cargar la reseña';
              this.snackBar.open(message, 'Cerrar', { duration: 3000 });
              this.router.navigate(['/reviews']);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((review) => {
        this.review.set(review);
        this.loading.set(false);
      });
  }

  protected vote(direction: VoteDirection): void {
    const current = this.review();
    if (!current || this.loadingVote()) {
      return;
    }

    const user = TokenStorage.getUser();
    if (!user?.id) {
      this.snackBar.open('Necesitas iniciar sesión para votar', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const previousVote = current.userVote ?? 0;
    const nextVote: VoteValue = previousVote === direction ? 0 : direction;
    const voteDelta = nextVote - previousVote;

    const optimistic: ReviewWithUserVote = {
      ...current,
      votes: current.votes + voteDelta,
      userVote: nextVote
    };
    this.review.set(optimistic);
    this.loadingVote.set(true);

    this.reviewsService.vote(current.id, direction, user.id).subscribe({
      next: ({ review: updated, userVote }) => {
        this.review.set({ ...updated, userVote });
        this.loadingVote.set(false);
      },
      error: (error) => {
        this.review.set(current);
        this.loadingVote.set(false);
        const message = error instanceof Error ? error.message : 'No se pudo registrar el voto';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
      }
    });
  }

  protected onCommentCreated(comment: Comment): void {
    const current = this.review();
    if (!current) {
      return;
    }
    this.review.set({ ...current, comments: current.comments + 1 });
    this.commentList?.prepend(comment);
  }

  protected onCommentRemoved(): void {
    const current = this.review();
    if (!current) {
      return;
    }
    this.review.set({ ...current, comments: Math.max(0, current.comments - 1) });
  }
}
