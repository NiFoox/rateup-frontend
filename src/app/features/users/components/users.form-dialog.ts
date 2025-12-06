import { ChangeDetectionStrategy, Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { User, AppRole } from '../../../core/users/users.models';

export interface UserFormDialogData {
  mode: 'create' | 'edit';
  user?: User;
}

export type UserFormDialogResult = {
  username: string;
  email: string;
  roles: AppRole[];
  isActive: boolean;
  password?: string;
};

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
export class UserFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<UserFormDialogComponent, UserFormDialogResult | null>
  );

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: UserFormDialogData) {}

  readonly availableRoles: AppRole[] = ['USER', 'ADMIN'];

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    roles: this.fb.nonNullable.control<AppRole[]>([], [Validators.required]),
    isActive: this.fb.nonNullable.control(true),
    password: this.fb.control<string | null>(null, [])
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.user) {
      const user = this.data.user;
      this.form.patchValue({
        username: user.username,
        email: user.email,
        roles: user.roles ?? [],
        isActive: user.isActive ?? true
      });
    }

    // Validaciones de password según modo
    if (this.data.mode === 'create') {
      this.form.get('password')?.addValidators([Validators.required, Validators.minLength(8)]);
    } else {
      this.form.get('password')?.addValidators([Validators.minLength(8)]);
    }

    this.form.get('password')?.updateValueAndValidity({ emitEvent: false });
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const { username, email, roles, isActive, password } = this.form.getRawValue();

    const result: UserFormDialogResult = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      roles: [...(roles ?? [])],
      isActive: !!isActive,
      ...(password ? { password } : {})
    };

    this.dialogRef.close(result);
  }
}
