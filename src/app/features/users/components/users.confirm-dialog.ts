import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-users-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './users.confirm-dialog.html',
  styleUrl: './users.confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersConfirmDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<UsersConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData
  ) {}

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
