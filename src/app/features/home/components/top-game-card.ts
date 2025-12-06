import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Game } from '../../../core/games/game.model';

type TopGameWithStats = Game & {
  avgScore?: number;
  reviewCount?: number;
};

@Component({
  selector: 'app-top-game-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './top-game-card.html',
  styleUrl: './top-game-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopGameCardComponent {
  @Input({ required: true }) game!: TopGameWithStats;
  @Input() index?: number;
}
