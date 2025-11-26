import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  QueryList,
  inject,
  signal,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { LoginRequest } from '../../../../core/auth/auth.models';
import { DEBUG } from '../../../../core/debug';

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
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren(MatInput) private readonly inputs!: QueryList<MatInput>;

  readonly form = this.fb.nonNullable.group({
    usernameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });
  readonly isLoading = signal(false);
  readonly errorMsg = signal<string | undefined>(undefined);
  readonly isPasswordHidden = signal(true);

  submit(): void {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidControl();
      return;
    }

    const { usernameOrEmail, password, rememberMe } = this.form.getRawValue();
    const payload: LoginRequest = { usernameOrEmail, password, rememberMe: !!rememberMe };
    DEBUG &&
      console.debug('[LOGIN] submit', {
        valid: this.form.valid,
        usernameOrEmail,
        rememberMe: !!rememberMe
      });

    this.isLoading.set(true);
    this.errorMsg.set(undefined);

    const login$ = this.authService
      .login(payload)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      );

    DEBUG && console.debug('[LOGIN] subscribe login observable');

    login$.subscribe({
        next: () => {
          DEBUG && console.debug('[LOGIN] success → navigate /home');
          this.errorMsg.set(undefined);
          void this.router.navigateByUrl('/home', { replaceUrl: true });
        },
        error: (error: unknown) => {
          DEBUG && console.debug('[LOGIN] error', error);
          const message = this.resolveErrorMessage(error as MockHttpError);
          this.errorMsg.set(message);
        },
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
