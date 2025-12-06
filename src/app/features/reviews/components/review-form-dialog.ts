import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { ReviewWithUserVote } from '../../../core/reviews/reviews.models';
import { Game } from '../../../core/games/game.model';
import { GamesService } from '../../../core/games/game.service';

export interface ReviewFormDialogData {
  mode: 'create' | 'edit';
  review?: ReviewWithUserVote;
}

export interface ReviewFormDialogResult {
  gameId: string;
  score: number;
  content: string;
}

@Component({
  selector: 'app-review-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './review-form-dialog.html',
  styleUrl: './review-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<ReviewFormDialogComponent, ReviewFormDialogResult | null>
  );
  private readonly gamesService = inject(GamesService);

  readonly games = signal<Game[]>([]);
  readonly loadingGames = signal(false);

  readonly form = this.fb.nonNullable.group({
    gameId: ['', [Validators.required]],
    score: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    content: ['', [Validators.required, Validators.minLength(10)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: ReviewFormDialogData) {}

  ngOnInit(): void {
    this.loadGames();

    if (this.data.mode === 'edit' && this.data.review) {
      const review = this.data.review;
      this.form.patchValue({
        gameId: review.gameId,
        score: review.score,
        content: review.content
      });

      // No se cambia el juego al editar
      this.form.get('gameId')?.disable();
    }
  }

  private loadGames(): void {
    this.loadingGames.set(true);

    this.gamesService.listAll().subscribe({
      next: (games) => {
        this.games.set(games ?? []);
        this.loadingGames.set(false);
      },
      error: () => {
        // Si falla dejamos la lista vacía
        this.games.set([]);
        this.loadingGames.set(false);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const result: ReviewFormDialogResult = {
      gameId: String(raw.gameId),
      score: Number(raw.score),
      content: raw.content.trim()
    };

    this.dialogRef.close(result);
  }
}
