import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  GameFormDialogComponent,
  GameFormDialogData
} from '../games/game-form-dialog';
import { GamesService } from '../../core/games/game.service';
import { Game } from '../../core/games/game.model';

@Component({
  selector: 'app-games-page',
  standalone: true,
  templateUrl: './games.page.html',
  styleUrls: ['./games.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamesPage implements OnInit {
  private readonly gamesService = inject(GamesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Game[]>([]);
  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly searchCtrl = new FormControl<string>('', { nonNullable: true });

  ngOnInit(): void {
    this.fetchPage(0, this.pageSize());

    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {
        this.pageIndex.set(0);
        this.fetchPage(0, this.pageSize(), value || undefined);
      });
  }

  private fetchPage(pageIndex: number, pageSize: number, search?: string): void {
    this.loading.set(true);

    this.gamesService
      .listPage({
        page: pageIndex + 1,
        limit: pageSize,
        search: search || undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.pageIndex.set(result.page - 1);
          this.pageSize.set(result.pageSize);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open(
            'No se pudieron cargar los juegos',
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);

    this.fetchPage(
      event.pageIndex,
      event.pageSize,
      this.searchCtrl.value || undefined
    );
  }

  clearSearch(): void {
    if (!this.searchCtrl.value) {
      return;
    }
    this.searchCtrl.setValue('');
  }

  openCreateDialog(): void {
    const ref = this.dialog.open<
      GameFormDialogComponent,
      GameFormDialogData,
      GameFormDialogData['game']
    >(GameFormDialogComponent, {
      width: '480px',
      data: {
        mode: 'create',
        game: {
          name: '',
          description: '',
          genre: ''
        }
      }
    });

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const payload = {
          name: result.name,
          description: result.description,
          genre: result.genre
        };

        this.mutate(
          this.gamesService.create(payload),
          'Juego creado correctamente'
        );
      });
  }

  openEditDialog(game: Game): void {
    const ref = this.dialog.open<
      GameFormDialogComponent,
      GameFormDialogData,
      GameFormDialogData['game']
    >(GameFormDialogComponent, {
      width: '480px',
      data: {
        mode: 'edit',
        game
      }
    });

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result || !game.id) {
          return;
        }

        const payload = {
          name: result.name,
          description: result.description,
          genre: result.genre
        };

        this.mutate(
          this.gamesService.update(game.id, payload),
          'Juego actualizado correctamente'
        );
      });
  }

  confirmDelete(game: Game): void {
    if (!game.id) {
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el juego "${game.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.mutate(
      this.gamesService.delete(game.id),
      'Juego eliminado correctamente'
    );
  }

  private mutate(request: Observable<unknown>, successMessage: string): void {
    this.mutating.set(true);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.mutating.set(false);
        this.snackBar.open(successMessage, 'Cerrar', { duration: 2500 });

        this.fetchPage(
          this.pageIndex(),
          this.pageSize(),
          this.searchCtrl.value || undefined
        );
      },
      error: () => {
        this.mutating.set(false);
        this.snackBar.open(
          'La operación no pudo completarse',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }
}
