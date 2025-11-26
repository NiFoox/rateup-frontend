import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

import { GameFormDialogComponent } from '../games/game-form-dialog';
import { GamesService } from '../../core/games/game.service';
import { Game } from '../../core/games/game.model';

@Component({
  selector: 'app-games-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    GameFormDialogComponent
  ],
  templateUrl: './games.page.html',
  styleUrls: ['./games.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesPage implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly gamesService = inject(GamesService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly games = signal<Game[]>([]);
  protected readonly loading = signal(false);
  protected readonly mutating = signal(false);

  ngOnInit(): void {
    this.fetchGames();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(GameFormDialogComponent, {
      width: '400px',
      data: {
        mode: 'create',
        game: { name: '', description: '', genre: '' }
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed())
      .subscribe((result?: Game) => {
        if (!result) {
          return;
        }

        this.mutate(this.gamesService.create(result), 'Juego creado correctamente');
      });
  }

  openEditDialog(game: Game): void {
    const dialogRef = this.dialog.open(GameFormDialogComponent, {
      width: '400px',
      data: {
        mode: 'edit',
        game: { ...game }
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed())
      .subscribe((result?: Game) => {
        if (!result || !game.id) {
          return;
        }

        this.mutate(this.gamesService.update(game.id, result), 'Juego actualizado');
      });
  }

  confirmDelete(game: Game): void {
    if (!game.id) {
      return;
    }

    const confirmed = confirm(`¿Eliminar "${game.name}"?`);
    if (!confirmed) {
      return;
    }

    this.mutate(this.gamesService.delete(game.id), 'Juego eliminado');
  }

  private fetchGames(): void {
    this.loading.set(true);
    this.gamesService
      .list({ all: true })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (result) => {
          this.games.set(result.items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('No se pudieron cargar los juegos', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private mutate(request: Observable<unknown>, successMessage: string): void {
    this.mutating.set(true);
    request.pipe(takeUntilDestroyed()).subscribe({
      next: () => {
        this.mutating.set(false);
        this.snackBar.open(successMessage, 'Cerrar', { duration: 2500 });
        this.fetchGames();
      },
      error: () => {
        this.mutating.set(false);
        this.snackBar.open('La operación no pudo completarse', 'Cerrar', { duration: 3000 });
      }
    });
  }
}