import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Game } from '../../../../core/services/game';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './game-card.html',
  styleUrls: ['./game-card.scss']
})
export class GameCard {
  @Input({ required: true }) game!: Game;

  get hasId(): boolean {
    return this.game?.id !== undefined && this.game.id !== null;
  }
}