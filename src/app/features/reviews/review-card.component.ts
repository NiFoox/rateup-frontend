import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Review } from '../../core/reviews/reviews.models';

type VoteDirection = -1 | 1;

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './review-card.component.html',
  styleUrl: './review-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewCardComponent {
  @Input() review?: Review;
  @Input() skeleton = false;
  @Output() vote = new EventEmitter<VoteDirection>();

  protected readonly skeletonLines = Array.from({ length: 4 }, (_, index) => index);
  protected readonly skeletonTags = Array.from({ length: 3 }, (_, index) => index);

  protected handleVote(direction: VoteDirection): void {
    if (this.skeleton || !this.review) {
      return;
    }
    this.vote.emit(direction);
  }

  protected isActive(direction: VoteDirection): boolean {
    return this.review?.userVote === direction;
  }

  protected score(): number {
    return this.review?.votes ?? 0;
  }

  protected relativeDate(date: string): string {
    const timestamp = Date.parse(date);
    if (Number.isNaN(timestamp)) {
      return '';
    }

    const now = Date.now();
    let diff = now - timestamp;
    if (diff < 0) {
      diff = 0;
    }

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;
    const year = 365 * day;

    if (diff < minute) {
      return 'hace un momento';
    }
    if (diff < hour) {
      const minutes = Math.floor(diff / minute);
      return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
    if (diff < day) {
      const hours = Math.floor(diff / hour);
      return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    if (diff < month) {
      const days = Math.floor(diff / day);
      return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }
    if (diff < year) {
      const months = Math.floor(diff / month);
      return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    const years = Math.floor(diff / year);
    return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
  }
}
