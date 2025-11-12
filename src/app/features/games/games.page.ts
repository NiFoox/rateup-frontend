import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { GameList } from './pages/game-list/game-list';
import { MatIconModule } from '@angular/material/icon';



@Component({
  selector: 'app-games-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './games.page.html',
  styleUrls: ['./games.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class GamesPage {
  gameList = GameList;
  games = [
    { title: 'maincra', description: 'Description for Game 1', genre: 'Action' },
    { title: 'Game 2', description: 'Description for Game 2', genre: 'Adventure' }
  ];
}

