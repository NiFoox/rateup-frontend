import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { Game } from '../../../../core/services/game';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './game-form.html',
  styleUrls: ['./game-form.scss']
})
export class GameForm implements OnChanges {
  private fb = inject(FormBuilder);

  @Input() value?: Game | null;
  @Output() save = new EventEmitter<Omit<Game, 'id'>>();

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    genre: ['', Validators.required],
    description: ['', Validators.required]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      if (this.value) {
        const { name, genre, description } = this.value;
        this.form.patchValue({ name: name ?? '', genre: genre ?? '', description: description ?? '' });
      } else {
        this.form.reset({ name: '', genre: '', description: '' });
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue());
  }
}