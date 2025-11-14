import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';

import { GameService, Game } from '../../../../core/services/game';
import { GameForm } from '../../components/game-form/game-form';

@Component({
  selector: 'app-game-create-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatSnackBarModule],
  templateUrl: './game-create.html',
  styleUrls: ['./game-create.scss']
})
export class GameCreate {
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  onSave(game: Omit<Game, 'id'>): void {
    this.gameService.create(game).subscribe({
      next: () => {
        this.snackBar.open('Juego creado', 'OK', { duration: 2500 });
        this.router.navigate(['/games']);
      },
      error: () => {
        this.snackBar.open('Error al guardar', 'Cerrar', { duration: 2500 });
      }
    });
  }
}