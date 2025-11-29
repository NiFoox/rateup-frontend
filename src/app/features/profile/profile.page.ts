import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { PrivateUserProfile } from '../../core/auth/auth.models';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatIconModule,
    UserAvatarComponent
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly profile = toSignal<PrivateUserProfile | null>(
    this.authService.me() as Observable<PrivateUserProfile | null>,
    { initialValue: null }
  );

  readonly loading = signal(false);
  readonly editMode = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    avatarUrl: ['' as string | null, [Validators.maxLength(255)]],
    bio: ['' as string | null, [Validators.maxLength(280)]]
  });

  ngOnInit(): void {
    const current = this.profile() as PrivateUserProfile | null;
    if (current) {
      this.form.patchValue({
        username: current.username,
        email: current.email,
        avatarUrl: current.avatarUrl ?? '',
        bio: current.bio ?? ''
      });
    }
  }

  toggleEdit(): void {
    const current = this.profile() as PrivateUserProfile | null;
    if (!current) return;

    if (!this.editMode()) {
      this.form.patchValue({
        username: current.username,
        email: current.email,
        avatarUrl: current.avatarUrl ?? '',
        bio: current.bio ?? ''
      });
    }

    this.editMode.update((v) => !v);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const current = this.profile() as PrivateUserProfile | null;
    if (!current) return;

    const { username, email, avatarUrl, bio } = this.form.getRawValue();

    const payload = {
      username: username !== current.username ? username : undefined,
      email: email !== current.email ? email : undefined,
      avatarUrl:
        (avatarUrl ?? '').trim() !== (current.avatarUrl ?? '')
          ? (avatarUrl ?? '').trim() || null
          : undefined,
      bio:
        (bio ?? '').trim() !== (current.bio ?? '')
          ? (bio ?? '').trim() || null
          : undefined
    };

    if (
      payload.username === undefined &&
      payload.email === undefined &&
      payload.avatarUrl === undefined &&
      payload.bio === undefined
    ) {
      this.editMode.set(false);
      return;
    }

    this.loading.set(true);

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.editMode.set(false);
        this.snackBar.open('Perfil actualizado', 'Cerrar', { duration: 2500 });
      },
      error: (error) => {
        this.loading.set(false);
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el perfil. Intentalo de nuevo.';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
      }
    });
  }
}
