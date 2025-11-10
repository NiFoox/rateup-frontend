import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppToolbar } from './shared/components/app-toolbar/app-toolbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppToolbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
