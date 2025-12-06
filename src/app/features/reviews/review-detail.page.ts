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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, map, distinctUntilChanged, switchMap, catchError, filter } from 'rxjs';

import { ReviewsService } from '../../core/reviews/reviews.service';
import { Comment, ReviewWithUserVote, VoteValue } from '../../core/reviews/reviews.models';
import { CommentFormComponent } from './components/comment-form';
import { CommentListComponent } from './components/comment-list';
import { fromNow } from '../../shared/utils/ui';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import {
  ReviewFormDialogComponent,
  ReviewFormDialogData,
  ReviewFormDialogResult
} from './components/review-form-dialog';
import {
  ReviewsConfirmDialogComponent,
  ReviewsConfirmDialogData
} from './components/reviews.confirm-dialog';

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
    MatDialogModule,
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
  private readonly dialog = inject(MatDialog);
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

  protected displayGame(review: ReviewWithUserVote): string {
    if (review.game?.name) {
      return review.game.genre
        ? `${review.game.genre}`
        : review.game.name;
      /*
      return review.game.genre
        ? `${review.game.name} • ${review.game.genre}`
        : review.game.name;
      */
    }
    return `Juego ${review.gameId}`;
  }

  protected displayAuthor(review: ReviewWithUserVote): string {
    return review.user?.username ?? `Usuario ${review.userId}`;
  }

  protected displayTitle(review: ReviewWithUserVote): string {
    return review.game?.name ?? `Reseña #${review.id}`;
  }

  protected canEdit(review: ReviewWithUserVote | null): boolean {
    if (!review) {
      return false;
    }

    const user = this.tokenStorage.getUser();
    if (!user) {
      return false;
    }

    // id del usuario logueado
    const currentUserId = String((user as any).id);

    // id del dueño de la reseña (preferimos el user anidado)
    const ownerId = String(review.user?.id ?? review.userId);
      
    // Dueño de la reseña
    return currentUserId === ownerId;
  }

  protected canDelete(review: ReviewWithUserVote | null): boolean {
    if (!review) {
      return false;
    }

    const user = this.tokenStorage.getUser();
    if (!user) {
      return false;
    }

    const currentUserId = String((user as any).id);
    const ownerId = String(review.user?.id ?? review.userId);
    const roles: string[] = Array.isArray((user as any).roles)
      ? (user as any).roles
      : [];

    // Puede borrar: dueño o ADMIN
    return currentUserId === ownerId || roles.includes('ADMIN');
  }

  protected onEditReview(review: ReviewWithUserVote): void {
    const dialogRef = this.dialog.open<
      ReviewFormDialogComponent,
      ReviewFormDialogData,
      ReviewFormDialogResult | null
    >(ReviewFormDialogComponent, {
      width: '480px',
      data: {
        mode: 'edit',
        review
      }
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((result): result is ReviewFormDialogResult => !!result),
        // 1) actualizamos en el backend
        switchMap((result) =>
          this.reviewsService.updateReview(review.id, {
            content: result.content,
            score: result.score
          })
        ),
        // 2) volvemos a pedir el full detalle para tener game/user completos
        switchMap(() => this.reviewsService.getFull(review.id))
      )
      .subscribe({
        next: (full) => {
          this.review.set(full.review);
          this.snackBar.open('Reseña actualizada correctamente.', 'Cerrar', {
            duration: 3000,
            politeness: 'polite'
          });
        },
        error: (error) => {
          console.error('[REVIEW DETAIL] update error', error);
          this.snackBar.open('No se pudo actualizar la reseña. Intentá nuevamente.', 'Cerrar', {
            duration: 4000,
            politeness: 'polite'
          });
        }
      });
  }

  protected onDeleteReview(review: ReviewWithUserVote): void {
    const dialogRef = this.dialog.open<
      ReviewsConfirmDialogComponent,
      ReviewsConfirmDialogData,
      boolean
    >(ReviewsConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar reseña',
        message:
          '¿Estás seguro de que querés eliminar esta reseña? Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar reseña',
        cancelLabel: 'Cancelar'
      }
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.reviewsService.deleteReview(review.id))
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Reseña eliminada correctamente.', 'Cerrar', {
            duration: 3000,
            politeness: 'polite'
          });
          void this.router.navigate(['/reviews']);
        },
        error: (error) => {
          console.error('[REVIEW DETAIL] delete error', error);
          const message =
            error instanceof Error
              ? error.message
              : 'No se pudo eliminar la reseña. Intentá nuevamente.';
          this.snackBar.open(message, 'Cerrar', {
            duration: 4000,
            politeness: 'polite'
          });
        }
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

    // Estado optimista
    const optimistic: ReviewWithUserVote = {
      ...current,
      voteSummary: {
        ...current.voteSummary,
        score: current.voteSummary.score + voteDelta,
        upvotes:
          current.voteSummary.upvotes +
          (nextVote === 1 ? 1 : previousVote === 1 ? -1 : 0),
        downvotes:
          current.voteSummary.downvotes +
          (nextVote === -1 ? 1 : previousVote === -1 ? -1 : 0)
      },
      userVote: nextVote
    };

    this.review.set(optimistic);
    this.loadingVote.set(true);

    if (nextVote === 0) {
      // Quitar voto → DELETE en backend
      this.reviewsService.deleteVote(current.id).subscribe({
        next: () => {
          // El estado optimista ya refleja userVote = 0 y los contadores ajustados
          this.loadingVote.set(false);
        },
        error: (error) => {
          // Volvemos al estado anterior
          this.review.set(current);
          this.loadingVote.set(false);
          const message =
            error instanceof Error ? error.message : 'No se pudo eliminar el voto';
          this.snackBar.open(message, 'Cerrar', {
            duration: 3000,
            politeness: 'polite'
          });
        }
      });
    } else {
      // Crear / actualizar voto → PUT con -1 o 1
      this.reviewsService.vote(current.id, nextVote).subscribe({
        next: ({ voteSummary, userVote }) => {
          const latest = this.review();
          if (!latest) {
            return;
          }
          this.review.set({
            ...latest,
            voteSummary,
            userVote
          });
          this.loadingVote.set(false);
        },
        error: (error) => {
          this.review.set(current);
          this.loadingVote.set(false);
          const message =
            error instanceof Error ? error.message : 'No se pudo registrar el voto';
          this.snackBar.open(message, 'Cerrar', {
            duration: 3000,
            politeness: 'polite'
          });
        }
      });
    }
  }

  protected onCommentCreated(comment: Comment): void {
    if (this.commentList) {
      this.commentList.prepend(comment);
    }

    const current = this.review();
    if (!current) {
      return;
    }

    const nextTotal = (current.comments ?? 0) + 1;
    this.review.set({
      ...current,
      comments: nextTotal
    });
  }

  protected onCommentsChanged(): void {
    const list = this.commentList;
    const total = list?.totalCount();
    const current = this.review();

    if (!list || total === undefined || !current) {
      return;
    }

    if (current.comments !== total) {
      this.review.set({
        ...current,
        comments: total
      });
    }
  }
}
