import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-games-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './games.page.html',
  styleUrls: ['./games.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesPage {

  games = [
    { name: 'maincra', description: 'Description for Game 1', genre: 'Action' },
    { name: 'Game 2', description: 'Description for Game 2', genre: 'Adventure' }
  ];

  constructor() {}

  openEditDialog(game: any) {
    console.log('Editar juego:', game);
  }

  confirmDelete(game: any) {
    console.log('Eliminar juego:', game);
  }
}


