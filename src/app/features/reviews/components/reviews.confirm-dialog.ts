import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ReviewsConfirmDialogData {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-reviews-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './reviews.confirm-dialog.html',
  styleUrl: './reviews.confirm-dialog.scss'
})
export class ReviewsConfirmDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ReviewsConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ReviewsConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
