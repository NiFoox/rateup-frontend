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

import { HttpErrorResponse } from '@angular/common/http';

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
    this.authService.refreshProfile(),
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
    const current = this.profile();
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
    const current = this.profile();
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

    const current = this.profile();
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

    // limpiamos errores "taken" anteriores antes de llamar al back
    this.form.controls.username.setErrors(
      this.stripTakenError(this.form.controls.username.errors)
    );
    this.form.controls.email.setErrors(
      this.stripTakenError(this.form.controls.email.errors)
    );

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.editMode.set(false);
        this.snackBar.open('Perfil actualizado', 'Cerrar', { duration: 2500 });
      },
      error: (error) => {
        this.loading.set(false);

        let message =
          'No se pudo actualizar el perfil. Intentalo de nuevo.';

        if (error instanceof HttpErrorResponse) {
          const body = error.error;

          const bodyIsObject =
            body !== null && typeof body === 'object' && !Array.isArray(body);

          const code =
            bodyIsObject && typeof body.code === 'string'
              ? (body.code as string)
              : undefined;

          const field =
            bodyIsObject && typeof body.field === 'string'
              ? (body.field as string)
              : undefined;

          const backendMessage =
            bodyIsObject && typeof body.message === 'string'
              ? (body.message as string)
              : undefined;

          // preferimos siempre el message del backend si viene
          if (backendMessage) {
            message = backendMessage;
          }

          // mapeamos a los form controls según code/field
          if (code === 'USERNAME_TAKEN' || field === 'username') {
            this.form.controls.username.setErrors({
              ...(this.form.controls.username.errors ?? {}),
              taken: true
            });
          } else if (code === 'EMAIL_TAKEN' || field === 'email') {
            this.form.controls.email.setErrors({
              ...(this.form.controls.email.errors ?? {}),
              taken: true
            });
          }
        }

        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
      }
    });
  }

  private stripTakenError(
    errors: Record<string, unknown> | null
  ): Record<string, unknown> | null {
    if (!errors) return null;
    const { taken, ...rest } = errors;
    return Object.keys(rest).length ? rest : null;
  }
}
