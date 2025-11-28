import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { User } from '../../../core/users/users.models';

export interface UserFormDialogData {
  mode: 'create' | 'edit';
  user?: User;
}

export type UserFormDialogResult = Omit<User, 'id' | 'createdAt'> & { password?: string };

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule
  ],
  templateUrl: './users.form-dialog.html',
  styleUrl: './users.form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialogComponent, UserFormDialogResult>);

  readonly data: UserFormDialogData;
  readonly rolesOptions = ['ADMIN', 'USER'];

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    roles: this.fb.nonNullable.control<string[]>([], [Validators.required]),
    isActive: this.fb.nonNullable.control(true),
    password: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) data: UserFormDialogData) {
    this.data = data;

    if (data.mode === 'edit' && data.user) {
      this.form.patchValue({
        username: data.user.username,
        email: data.user.email,
        roles: [...data.user.roles],
        isActive: data.user.isActive
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, email, roles, isActive, password } = this.form.getRawValue();
    const result: UserFormDialogResult = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      roles: [...roles],
      isActive: isActive,
      ...(password ? { password } : {})
    };

    this.dialogRef.close(result);
  }
}
