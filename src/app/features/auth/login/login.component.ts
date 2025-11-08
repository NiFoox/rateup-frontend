import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  QueryList,
  computed,
  inject,
  signal,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { LoginRequest } from '../../../core/auth/auth.models';

interface MockHttpError extends Error {
  status: number;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren(MatInput) private readonly inputs!: QueryList<MatInput>;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  readonly isLoading = signal(false);
  readonly isPasswordHidden = signal(true);
  readonly isSubmitDisabled = computed(() => this.isLoading() || this.form.invalid);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidControl();
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();
    const payload: LoginRequest = { email, password, remember: rememberMe };

    this.isLoading.set(true);
    this.authService
      .login(payload)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Bienvenido nuevamente 👋', 'Cerrar', {
            duration: 3000,
            verticalPosition: 'top'
          });
          void this.router.navigateByUrl('/users');
        },
        error: (error: unknown) => {
          const message = this.resolveErrorMessage(error as MockHttpError);
          this.snackBar.open(message, 'Cerrar', {
            duration: 5000,
            verticalPosition: 'top'
          });
        }
      });
  }

  togglePasswordVisibility(): void {
    this.isPasswordHidden.update((hidden) => !hidden);
  }

  private resolveErrorMessage(error: MockHttpError): string {
    if (typeof error?.status === 'number') {
      if (error.status === 401) {
        return 'Credenciales inválidas. Verifica tu email y contraseña.';
      }

      if (error.status === 403) {
        return 'Tu usuario está deshabilitado. Contacta al administrador.';
      }
    }

    return 'No pudimos iniciar sesión. Intenta nuevamente en unos instantes.';
  }

  private focusFirstInvalidControl(): void {
    const controls = this.form.controls;

    for (const controlName of Object.keys(controls) as Array<keyof typeof controls>) {
      if (controls[controlName].invalid) {
        const invalidInput = this.inputs.find((input) => input.ngControl?.name === controlName);
        invalidInput?.focus();
        break;
      }
    }
  }
}
