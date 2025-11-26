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
  template: `
    <h2>
      {{ data.mode === 'create' ? 'Crear juego' : 'Editar juego' }}
    </h2>

    <mat-form-field appearance="outline">
      <mat-label>Nombre</mat-label>
      <input matInput [(ngModel)]="data.game.name" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Descripción</mat-label>
      <input matInput [(ngModel)]="data.game.description" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Género</mat-label>
      <input matInput [(ngModel)]="data.game.genre" />
    </mat-form-field>

    <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="save()">Guardar</button>
    </div>
  `
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
