import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { ReviewWithUserVote, VoteValue } from '../../core/reviews/reviews.models';
import { fromNow } from '../../shared/utils/ui';

type VoteDirection = Exclude<VoteValue, 0>;

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
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './review-card.component.html',
  styleUrl: './review-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewCardComponent {
  @Input() review?: ReviewWithUserVote;
  @Input() skeleton = false;
  @Output() vote = new EventEmitter<VoteDirection>();

  protected readonly skeletonLines = Array.from({ length: 4 }, (_, index) => index);
  protected readonly skeletonTags = Array.from({ length: 3 }, (_, index) => index);
  protected readonly relative = fromNow;

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
    return this.review?.voteSummary.score ?? 0;
  }

  protected displayTitle(): string {
    if (!this.review) {
      return '';
    }
    return this.review.game?.name ?? `Reseña #${this.review.id}`;
  }

  protected displayGame(): string {
    if (!this.review) {
      return '';
    }
    if (this.review.game?.name) {
      return this.review.game.genre
        ? `${this.review.game.name} • ${this.review.game.genre}`
        : this.review.game.name;
    }
    return `Juego ${this.review.gameId}`;
  }

  protected displayAuthor(): string {
    if (!this.review) {
      return '';
    }
    return this.review.user?.username ?? `Usuario ${this.review.userId}`;
  }
}
