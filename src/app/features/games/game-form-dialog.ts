import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
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
  styleUrls: ['./game-form-dialog.scss'],
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
    private readonly dialogRef: MatDialogRef<
      GameFormDialogComponent,
      GameFormDialogData['game'] | undefined
    >,
    @Inject(MAT_DIALOG_DATA) readonly data: GameFormDialogData
  ) {
    this.form = this.fb.group({
      name: [data.game?.name ?? '', [Validators.required, Validators.maxLength(120)]],
      description: [
        data.game?.description ?? '',
        [Validators.required, Validators.maxLength(500)]
      ],
      genre: [data.game?.genre ?? '', [Validators.required, Validators.maxLength(60)]]
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

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
