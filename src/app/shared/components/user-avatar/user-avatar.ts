import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-avatar.html',
  styleUrl: './user-avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAvatarComponent {
  @Input() username: string | null = null;
  @Input() avatarUrl: string | null = null;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  get initials(): string {
    if (!this.username) return '?';
    const parts = this.username.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  get cssClass(): string {
    return `avatar avatar--${this.size}`;
  }
}
