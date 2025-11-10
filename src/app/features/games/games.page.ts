import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-games-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './games.page.html',
  styleUrl: './games.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesPage {}
