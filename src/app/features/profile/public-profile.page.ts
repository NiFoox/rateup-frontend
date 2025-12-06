import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EMPTY, finalize, switchMap } from 'rxjs';

import { UsersService } from '../../core/users/users.service';
import { PublicUserProfile } from '../../core/users/users.models';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar';
import { AuthService } from '../../core/auth/auth.service';
import { ReviewsService } from '../../core/reviews/reviews.service';
import { PagedResult, ReviewWithUserVote } from '../../core/reviews/reviews.models';
import { MatAnchor } from "@angular/material/button";

interface UserReviewPreview {
  id: string;
  gameName: string;
  score: number;
  content: string;
  createdAt: string;
}

@Component({
  selector: 'app-public-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
    UserAvatarComponent,
    MatAnchor,
    RouterModule
],
  templateUrl: './public-profile.page.html',
  styleUrl: './public-profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly usersService = inject(UsersService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly profile = signal<PublicUserProfile | null>(null);
  readonly isLoading = signal(true);
  readonly isOwnProfile = signal(false);

  readonly reviews = signal<UserReviewPreview[]>([]);
  readonly isLoadingReviews = signal(false);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
        const id = Number(idParam);
        if (!id || Number.isNaN(id)) {
        this.isLoading.set(false);
        this.snackBar.open('ID de usuario inválido.', 'Cerrar', {
            duration: 3000
        });
        return;
        }

        this.loadProfileById(id);
        return;
    }

    this.isLoading.set(true);

    this.authService
      .refreshProfile()
      .pipe(
        switchMap((me) => {
          if (!me) {
            this.snackBar.open(
              'No se pudo obtener tu usuario actual. Volvé a iniciar sesión.',
              'Cerrar',
              { duration: 3000 }
            );
            this.isOwnProfile.set(false);
            return EMPTY;
          }

          this.isOwnProfile.set(true);
          return this.usersService.getPublicProfile(me.id);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (publicProfile) => {
          this.profile.set(publicProfile);
          this.loadReviewsForSelf();
        },
        error: (error) => {
          console.error(error);
          this.snackBar.open(
            'No se pudo cargar tu perfil. Intentá nuevamente.',
            'Cerrar',
            { duration: 3000 }
          );
          this.profile.set(null);
        }
      });
  }

  private loadProfileById(id: number): void {
    this.isLoading.set(true);

    this.usersService
      .getPublicProfile(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);

          const currentUser = this.authService.getCurrentUserSnapshot();
          const isOwn = !!currentUser && currentUser.id === profile.id;
          this.isOwnProfile.set(isOwn);

          this.loadReviewsByUser(profile.id);
        },
        error: (error) => {
          console.error(error);
          const message =
            error?.status === 404
              ? 'Usuario no encontrado.'
              : 'No se pudo cargar este perfil. Intentá nuevamente.';

          this.snackBar.open(message, 'Cerrar', { duration: 3000 });
          this.profile.set(null);
          this.isOwnProfile.set(false);
        }
      });
  }


  private setReviewsFromResult(result: PagedResult<ReviewWithUserVote>): void {
    const previews: UserReviewPreview[] = (result.data ?? []).map((review) => ({
      id: review.id,
      gameName: review.game?.name ?? 'Juego desconocido',
      score: review.score,
      content: review.content,
      createdAt: review.createdAt
    }));
    this.reviews.set(previews);
  }

  private loadReviewsForSelf(): void {
    this.isLoadingReviews.set(true);
    this.reviews.set([]);

    this.reviewsService
      .listMine({ page: 1, pageSize: 5 })
      .pipe(finalize(() => this.isLoadingReviews.set(false)))
      .subscribe({
        next: (result) => this.setReviewsFromResult(result),
        error: (error) => {
          console.error(error);
          this.snackBar.open(
            'No se pudieron cargar tus reseñas.',
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
  }

  private loadReviewsByUser(userId: number): void {
    this.isLoadingReviews.set(true);
    this.reviews.set([]);

    this.reviewsService
      .list({
        page: 1,
        pageSize: 5,
        userId: String(userId)
      })
      .pipe(finalize(() => this.isLoadingReviews.set(false)))
      .subscribe({
        next: (result) => this.setReviewsFromResult(result),
        error: (error) => {
          console.error(error);
          this.snackBar.open(
            'No se pudieron cargar las reseñas recientes.',
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
  }

  onEditProfile(): void {
    this.router.navigate(['/profile']);
  }

  onReviewClick(reviewId: string): void {
    this.router.navigate(['/reviews', reviewId]);
  }
}
