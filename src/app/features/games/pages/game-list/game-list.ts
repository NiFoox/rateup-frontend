import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { GameService, Game } from '../../../../core/services/game';
import { AppToolbar } from '../../../../shared/components/app-toolbar/app-toolbar';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, AppToolbar],
  selector: 'app-game-list',
  templateUrl: './game-list.html',
  styleUrls: ['./game-list.scss']
})
export class GameList {
  private service = inject(GameService);
  games = signal<Game[]>([]);

  ngOnInit() {
    this.service.list().subscribe(g => this.games.set(g));
  }
}
