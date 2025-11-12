import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../../../../core/services/game.model';
import { GamesService } from '../../../../core/services/game';

@Component({
  selector: 'app-game-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-list.html',
  styleUrl: './game-list.scss',
})
export class GameList {

  games: Game[] = [];

  constructor(private gameService: GamesService){
    this.gameService.list().subscribe(g => {
      this.games = g;
    });
  }

}
