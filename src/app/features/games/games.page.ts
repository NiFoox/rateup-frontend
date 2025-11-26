import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { GameFormDialogComponent } from '../games/game-form-dialog';

@Component({
  selector: 'app-games-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, GameFormDialogComponent],
  templateUrl: './games.page.html',
  styleUrls: ['./games.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesPage {

  games: any[] = [];

  constructor(private dialog: MatDialog) {}

  openCreateDialog() {
    const dialogRef = this.dialog.open(GameFormDialogComponent, {
      width: '400px',
      data: {
        mode: 'create',
        game: { name: '', description: '', genre: '' }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.games.push(result);
      }
    });
  }

  openEditDialog(game: any) {
    const dialogRef = this.dialog.open(GameFormDialogComponent, {
      width: '400px',
      data: {
        mode: 'edit',
        game: { ...game }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        game.name = result.name;
        game.description = result.description;
        game.genre = result.genre;
      }
    });
  }

  confirmDelete(game: any) {
    this.games = this.games.filter(g => g !== game);
  }
}