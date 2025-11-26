import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface GameFormData {
  mode: 'create' | 'edit';
  game?: any;
}

@Component({
  selector: 'app-game-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './game-form-dialog.html',
  styleUrl: './game-form-dialog.scss' 
})
export class GameFormDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<GameFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GameFormData
  ) {}

  save() {
    this.dialogRef.close(this.data.game);
  }
}