import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Observable, debounceTime, finalize, switchMap } from 'rxjs';

import { UsersService } from '../../core/users/users.service';
import { User } from '../../core/users/users.models';
import {
  UserFormDialogComponent,
  UserFormDialogData,
  UserFormDialogResult
} from './components/users.form-dialog';
import { UsersConfirmDialogComponent } from './components/users.confirm-dialog';

type SortState = {
  active: keyof User | '';
  direction: 'asc' | 'desc' | '';
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    RouterLink
  ],
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'username',
    'email',
    'roles',
    'isActive',
    'createdAt',
    'actions'
  ] as const;

  readonly dataSource = new MatTableDataSource<User>([]);

  readonly isLoading = signal(false);
  readonly isMutating = signal(false);
  readonly total = signal(0);

  // MatPaginator usa pageIndex 0-based → mantenemos 0-based acá
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly sortState = signal<SortState>({
    active: 'createdAt',
    direction: 'desc'
  });

  readonly filterForm = this.fb.nonNullable.group({
    search: ['']
  });

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.loadUsers();
      });

    this.loadUsers();
  }

  onSortChange(sort: Sort): void {
    const active = (sort.active ?? '') as keyof User | '';
    const direction = (sort.direction ?? '') as 'asc' | 'desc' | '';

    this.sortState.set({ active, direction });
    this.applySorting();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex); // 0-based
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open<
      UserFormDialogComponent,
      UserFormDialogData,
      UserFormDialogResult
    >(UserFormDialogComponent, {
      width: '400px',
      data: { mode: 'create' }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        // En modo create, el formulario garantiza que password venga con valor
        const { password, ...rest } = result;

        if (!password) {
          // Por si acaso, pero no debería pasar
          this.snackBar.open(
            'La contraseña es obligatoria para crear un usuario.',
            'Cerrar',
            { duration: 3000, verticalPosition: 'top' }
          );
          return;
        }

        const payload = {
          ...rest,
          password
        };

        this.mutate(
          () => this.usersService.create(payload),
          'Usuario creado correctamente.'
        );
      });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open<
      UserFormDialogComponent,
      UserFormDialogData,
      UserFormDialogResult
    >(UserFormDialogComponent, {
      width: '400px',
      data: { mode: 'edit', user }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        // Separar campos de usuario de los roles
        const { roles, password, ...rest } = result;

        const payload: {
          username?: string;
          email?: string;
          password?: string;
          isActive?: boolean;
        } = {
          ...rest,
          ...(password ? { password } : {})
        };

        // 1) PATCH /users/:id con datos generales
        // 2) PATCH /users/:id/roles con los roles
        this.mutate(
          () =>
            this.usersService
              .update(user.id, payload)
              .pipe(
                switchMap(() => this.usersService.updateRoles(user.id, roles))
              ),
          'Usuario actualizado correctamente.'
        );
      });
  }

  confirmDelete(user: User): void {
    const dialogRef = this.dialog.open(UsersConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Eliminar usuario',
        message: `¿Seguro que querés eliminar a "${user.username}"? Esta acción no se puede deshacer.`
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.mutate(
          () => this.usersService.delete(user.id),
          'Usuario eliminado correctamente.'
        );
      });
  }

  toggleStatus(user: User, active: boolean): void {
    // Evitamos pegarle al back si el valor no cambia realmente
    if (user.isActive === active) {
      return;
    }

    this.mutate(
      () => this.usersService.setStatus(user.id, active),
      'Estado actualizado.'
    );
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    const filters = this.filterForm.getRawValue();

    this.usersService
      .list({
        // API espera page 1-based → sumamos 1
        page: this.pageIndex() + 1,
        pageSize: this.pageSize(),
        search: filters.search || undefined
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.dataSource.data = result.data;
          this.total.set(result.total);

          // La API devuelve page 1-based → lo convertimos a 0-based para el paginator
          this.pageIndex.set(result.page - 1);
          this.pageSize.set(result.pageSize);

          this.applySorting?.();
        },
        error: (error: unknown) => this.handleError(error)
      });
  }

  private applySorting(): void {
    const { active, direction } = this.sortState();

    if (!active || !direction) {
      return;
    }

    const data = [...this.dataSource.data];

    data.sort((a, b) => {
      const aValue = this.normalizeSortValue(a[active]);
      const bValue = this.normalizeSortValue(b[active]);

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }

      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }

      return 0;
    });

    this.dataSource.data = data;
  }

  private normalizeSortValue(value: unknown): string | number {
    if (value == null) {
      return '';
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    return String(value);
  }

  private mutate(
    operation: () => Observable<unknown>,
    successMessage: string
  ): void {
    this.isMutating.set(true);

    operation()
      .pipe(
        finalize(() => {
          this.isMutating.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackBar.open(successMessage, 'Cerrar', {
            duration: 3000,
            verticalPosition: 'top'
          });
          this.loadUsers();
        },
        error: (error: unknown) => this.handleError(error)
      });
  }

  private handleError(error: unknown): void {
    this.snackBar.open(this.resolveErrorMessage(error), 'Cerrar', {
      duration: 5000,
      verticalPosition: 'top'
    });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const status = error.status;
      const apiError = (error.error ?? {}) as {
        message?: string;
        code?: string;
        field?: string;
      };

      // Conflictos de negocio (username/email en uso, etc.)
      if (status === 409) {
        if (apiError.message) {
          return apiError.message;
        }
        return 'Los datos ingresados ya están en uso.';
      }

      if (status === 400) {
        return 'Datos inválidos. Revisá el formulario.';
      }

      if (status === 403) {
        return 'No tenés permisos para realizar esta acción.';
      }

      if (status === 404) {
        return 'Recurso no encontrado.';
      }

      if (status >= 500) {
        return 'Error del servidor. Intentá nuevamente más tarde.';
      }
    }

    return 'Ocurrió un error inesperado. Intentá nuevamente.';
  }
}
