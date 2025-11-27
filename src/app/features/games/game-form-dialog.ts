import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface GameFormDialogData {
  mode: 'create' | 'edit';
  game: {
    id?: string;
    name: string;
    description: string;
    genre: string;
  };
}

@Component({
  selector: 'app-game-form-dialog',
  standalone: true,
  templateUrl: './game-form-dialog.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class GameFormDialogComponent {
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<GameFormDialogComponent, GameFormDialogData['game']>,
    @Inject(MAT_DIALOG_DATA) public readonly data: GameFormDialogData
  ) {
    this.form = this.fb.group({
      name: [data.game?.name ?? '', [Validators.required]],
      description: [data.game?.description ?? '', [Validators.required]],
      genre: [data.game?.genre ?? '', [Validators.required]]
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // devolvemos el mismo shape de `game` (sin tocar id)
    const value: GameFormDialogData['game'] = {
      ...this.data.game,
      ...this.form.value
    };

    this.dialogRef.close(value);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
