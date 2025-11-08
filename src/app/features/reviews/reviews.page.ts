import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-reviews-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './reviews.page.html',
  styleUrl: './reviews.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewsPage {}
