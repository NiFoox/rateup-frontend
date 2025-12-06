// features/reviews/pages/review-create/review-create.component.ts
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { ReviewService } from '../../../../core/services/review';
import { GameService, Game } from '../../../../core/services/game';
import { AppToolbar } from '../../../../shared/components/app-toolbar/app-toolbar';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule, MatSelectModule, AppToolbar
  ],
  selector: 'app-review-create',
  templateUrl: './review-create.html',
  styleUrls: ['./review-create.scss']
})
export class ReviewCreate {
  private fb = inject(FormBuilder);
  private reviews = inject(ReviewService);
  private snack = inject(MatSnackBar);
  private gamesSvc = inject(GameService);

  games: Game[] = [];

  form = this.fb.group({
    gameTitle: ['', Validators.required],
    content: ['', Validators.required],
    score: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    author: ['', Validators.required],
  });

  ngOnInit() {
    // para poblar el select con nombres de juegos
    this.gamesSvc.list().subscribe(g => this.games = g);
  }

  submit() {
    if (this.form.invalid) return;
    this.reviews.create(this.form.value as any).subscribe({
      next: () => this.snack.open('Reseña creada', 'OK', { duration: 2000 }),
      error: () => this.snack.open('Error al crear reseña', 'OK', { duration: 2000 })
    });
  }
}
