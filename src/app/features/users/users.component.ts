import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Observable, debounceTime, finalize } from 'rxjs';

import { UsersService } from '../../core/users/users.service';
import { User } from '../../core/users/users.models';
import {
  UserFormDialogComponent,
  UserFormDialogData,
  UserFormDialogResult
} from './users.form-dialog';
import { UsersConfirmDialogComponent } from './users.confirm-dialog';

type SortDirection = 'asc' | 'desc';

type ErrorWithStatus = Error & { status?: number };

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
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
    MatSlideToggleModule
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns: Array<keyof User | 'actions'> = [
    'username',
    'email',
    'roles',
    'isActive',
    'createdAt',
    'actions'
  ];

  readonly dataSource = new MatTableDataSource<User>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(1);
  readonly pageSize = signal(10);
  readonly isLoading = signal(false);
  readonly isMutating = signal(false);
  readonly sortState = signal<{ active: keyof User; direction: SortDirection }>(
    {
      active: 'createdAt',
      direction: 'desc'
    }
  );

  readonly rolesOptions = ['admin', 'editor', 'viewer'];

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    role: ['all'],
    active: ['all']
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
    if (!sort.direction) {
      this.sortState.set({ active: 'createdAt', direction: 'desc' });
    } else {
      this.sortState.set({
        active: sort.active as keyof User,
        direction: sort.direction as SortDirection
      });
    }

    this.loadUsers();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open<UserFormDialogComponent, UserFormDialogData, UserFormDialogResult>(
      UserFormDialogComponent,
      {
        width: '400px',
        data: { mode: 'create' }
      }
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.mutate(() => this.usersService.create(result), 'Usuario creado correctamente.');
      });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open<UserFormDialogComponent, UserFormDialogData, UserFormDialogResult>(
      UserFormDialogComponent,
      {
        width: '400px',
        data: { mode: 'edit', user }
      }
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const { password: _password, ...payload } = result;
        this.mutate(() => this.usersService.update(user.id, payload), 'Usuario actualizado correctamente.');
      });
  }

  confirmDelete(user: User): void {
    const dialogRef = this.dialog.open(UsersConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Eliminar usuario',
        message: `¿Deseas eliminar a ${user.username}? Esta acción no se puede deshacer.`
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) {
          return;
        }

        this.mutate(() => this.usersService.remove(user.id), 'Usuario eliminado correctamente.');
      });
  }

  toggleStatus(user: User, active: boolean): void {
    this.mutate(() => this.usersService.setStatus(user.id, active), 'Estado actualizado.');
  }

  private mutate(operation: () => Observable<unknown>, successMessage: string): void {
    this.isMutating.set(true);

    operation()
      .pipe(
        finalize(() => this.isMutating.set(false)),
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
        error: (error: unknown) => {
          this.handleError(error);
          this.loadUsers();
        }
      });
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    const filters = this.filterForm.getRawValue();
    const role = filters.role === 'all' ? undefined : filters.role;
    const active = filters.active === 'all' ? undefined : filters.active === 'true';

    this.usersService
      .list({
        page: this.pageIndex(),
        pageSize: this.pageSize(),
        search: filters.search || undefined,
        sort: this.sortState().active,
        dir: this.sortState().direction,
        role,
        active
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.dataSource.data = result.data;
          this.total.set(result.total);
          this.pageIndex.set(result.page);
          this.pageSize.set(result.pageSize);
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
    if (error instanceof Error && 'status' in error) {
      const status = (error as ErrorWithStatus).status;

      if (status === 400) {
        return 'Datos inválidos. Revisa el formulario.';
      }

      if (status === 403) {
        return 'No tienes permisos para realizar esta acción.';
      }

      if (status === 404) {
        return 'El usuario no existe o ya fue eliminado.';
      }

      if (status === 409) {
        return 'Ya existe un usuario con ese email.';
      }
    }

    return 'Ocurrió un error inesperado. Intenta nuevamente más tarde.';
  }
}
