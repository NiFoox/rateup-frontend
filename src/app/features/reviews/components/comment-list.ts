import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Comment } from '../../../core/reviews/reviews.models';
import { ReviewsService } from '../../../core/reviews/reviews.service';
import { TokenStorageService } from '../../../core/auth/token-storage.service';
import { avatarColor, fromNow } from '../../../shared/utils/ui';

@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './comment-list.html',
  styleUrl: './comment-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentListComponent implements OnChanges {
  @Input() reviewId = '';
  @Output() changed = new EventEmitter<void>();

  protected readonly comments = signal<Comment[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(false);
  protected readonly total = signal(0);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]
  });
  protected readonly savingEdit = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly relative = fromNow;
  protected readonly colorFor = avatarColor;

  private readonly tokenStorage = inject(TokenStorageService);
  protected readonly currentUser = this.tokenStorage.getUser();
  protected readonly isAdmin = this.currentUser?.roles?.includes('ADMIN') ?? false;

  private readonly reviewsService = inject(ReviewsService);
  private readonly snackBar = inject(MatSnackBar);
  private page = 1;
  private readonly pageSize = 10;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reviewId']) {
      this.reset();
      if (this.reviewId) {
        this.loadPage(1, false);
      }
    }
  }

  prepend(comment: Comment): void {
    const current = this.comments();
    const next = [comment, ...current];
    const nextTotal = this.total() + 1;

    this.comments.set(next);
    this.total.set(nextTotal);
    this.hasMore.set(nextTotal > next.length);
    this.changed.emit();
  }

  reload(): void {
    if (!this.reviewId) {
      return;
    }
    this.reset();
    this.loadPage(1, false);
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }
    this.loadPage(this.page + 1, true);
  }

  protected isOwner(comment: Comment): boolean {
    return !!comment && comment.authorId === String(this.currentUser?.id);
  }

  protected canEdit(comment: Comment): boolean {
    return this.isOwner(comment);
  }

  protected canDelete(comment: Comment): boolean {
    return this.isOwner(comment) || this.isAdmin;
  }

  protected startEdit(comment: Comment): void {
    if (!this.canEdit(comment) || this.savingEdit()) {
      return;
    }
    this.editingId.set(comment.id);
    this.editControl.setValue(comment.content);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editControl.setValue('');
    this.editControl.markAsPristine();
    this.editControl.markAsUntouched();
  }

  protected saveEdit(comment: Comment): void {
    if (!this.canEdit(comment) || this.editControl.invalid || this.savingEdit()) {
      return;
    }
    const userId = String(this.currentUser?.id ?? '');
    if (!userId) {
      this.snackBar.open('Necesitas iniciar sesión para editar', 'Cerrar', {
        duration: 3000,
        politeness: 'polite'
      });
      return;
    }
    const value = this.editControl.value.trim();
    if (value.length < 2) {
      this.snackBar.open('El comentario es demasiado corto', 'Cerrar', {
        duration: 3000,
        politeness: 'polite'
      });
      return;
    }

    this.savingEdit.set(true);
    this.reviewsService.editComment(this.reviewId, comment.id, value).subscribe({
      next: (updated) => {
        const list = this.comments();
        const index = list.findIndex((item) => item.id === updated.id);
        if (index !== -1) {
          const merged = [...list];
          merged[index] = updated;
          this.comments.set(merged);
        }
        this.savingEdit.set(false);
        this.cancelEdit();
        this.changed.emit();
      },
      error: (error) => {
        this.savingEdit.set(false);
        const message = error instanceof Error ? error.message : 'No se pudo editar el comentario';
        this.snackBar.open(message, 'Cerrar', { duration: 3000, politeness: 'polite' });
      }
    });
  }

  protected deleteComment(comment: Comment): void {
    if (this.deletingId() || !this.reviewId || !this.canDelete(comment)) {
      return;
    }
    const userId = String(this.currentUser?.id ?? '');
    if (!userId) {
      this.snackBar.open('Necesitas iniciar sesión para eliminar', 'Cerrar', {
        duration: 3000,
        politeness: 'polite'
      });
      return;
    }
    const confirmed = confirm('¿Eliminar este comentario?');
    if (!confirmed) {
      return;
    }

    this.deletingId.set(comment.id);
    this.reviewsService.deleteComment(this.reviewId, comment.id).subscribe({
      next: () => {
        const filtered = this.comments().filter((item) => item.id !== comment.id);
        this.comments.set(filtered);
        this.deletingId.set(null);
        const nextTotal = Math.max(0, this.total() - 1);
        this.total.set(nextTotal);
        this.hasMore.set(nextTotal > filtered.length);
        this.changed.emit();
      },
      error: (error) => {
        this.deletingId.set(null);
        const message = error instanceof Error ? error.message : 'No se pudo eliminar el comentario';
        this.snackBar.open(message, 'Cerrar', { duration: 3000, politeness: 'polite' });
      }
    });
  }

  private reset(): void {
    this.comments.set([]);
    this.page = 1;
    this.total.set(0);
    this.hasMore.set(false);
    this.loading.set(false);
    this.loadingMore.set(false);
    this.editingId.set(null);
    this.editControl.setValue('');
    this.editControl.markAsPristine();
    this.editControl.markAsUntouched();
  }

  private loadPage(page: number, append: boolean): void {
    if (!this.reviewId) {
      return;
    }
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }

    this.reviewsService.getComments(this.reviewId, page, this.pageSize).subscribe({
      next: (result) => {
        const nextItems = append
          ? [...this.comments(), ...result.data]
          : result.data;
        this.comments.set(nextItems);
        this.page = result.page;
        this.total.set(result.total);
        const hasMore = result.data.length === result.pageSize;
        this.hasMore.set(hasMore);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.loadingMore.set(false);
        const message = error instanceof Error ? error.message : 'No se pudieron cargar los comentarios';
        this.snackBar.open(message, 'Cerrar', { duration: 3000, politeness: 'polite' });
      }
    });
  }

  totalCount(): number {
    return this.total();
  }
}
