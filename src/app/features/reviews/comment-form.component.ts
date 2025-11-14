import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ReviewsService } from '../../core/reviews/reviews.service';
import { Comment } from '../../core/reviews/reviews.models';
import { TokenStorage } from '../../core/auth/token-storage';

@Component({
  selector: 'app-comment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './comment-form.component.html',
  styleUrl: './comment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentFormComponent {
  @Input() reviewId = '';
  @Output() created = new EventEmitter<Comment>();

  protected readonly control = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]
  });
  protected readonly submitting = signal(false);

  private readonly reviewsService = inject(ReviewsService);
  private readonly snackBar = inject(MatSnackBar);

    protected submit(): void {
      if (this.submitting() || this.control.invalid || !this.reviewId) {
        return;
      }

      const user = TokenStorage.getUser();
      const userId = user?.id ?? '';
      const authorName = user?.name ?? '';

      if (!userId || !authorName) {
        this.snackBar.open('Necesitas iniciar sesión para comentar', 'Cerrar', {
          duration: 3000,
          politeness: 'polite'
        });
        return;
      }

      const value = this.control.value.trim();
      if (value.length < 2) {
        this.snackBar.open('El comentario es demasiado corto', 'Cerrar', {
          duration: 3000,
          politeness: 'polite'
        });
        return;
      }

      this.submitting.set(true);
      this.reviewsService.addComment(this.reviewId, value, userId, authorName).subscribe({
        next: (comment) => {
          this.created.emit(comment);
          this.control.setValue('');
          this.control.markAsPristine();
          this.control.markAsUntouched();
          this.submitting.set(false);
        },
        error: (error) => {
          this.submitting.set(false);
          const message = error instanceof Error ? error.message : 'No se pudo publicar el comentario';
          this.snackBar.open(message, 'Cerrar', { duration: 3000, politeness: 'polite' });
        }
      });
  }
}
