import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../../../../core/games/game.model';
// import { GamesService } from '../../../../core/games/game.service';

@Component({
  selector: 'app-game-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-list.html',
  styleUrl: './game-list.scss',
})
export class GameList {

  games: Game[] = [];

}
