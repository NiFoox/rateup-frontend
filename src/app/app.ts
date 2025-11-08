import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

import { AppToolbar } from './shared/components/app-toolbar/app-toolbar';
import { AuthService } from './core/auth/auth.service';
import { TokenStorageService } from './core/auth/token-storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppToolbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly currentUser = toSignal(this.authService.me(), {
    initialValue: this.tokenStorage.getUser()
  });

  private readonly hideToolbar = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.shouldHideToolbar())
    ),
    { initialValue: this.shouldHideToolbar() }
  );

  protected readonly showToolbar = computed(
    () => this.currentUser() !== null && !this.hideToolbar()
  );

  private shouldHideToolbar(): boolean {
    let route: ActivatedRoute | null = this.router.routerState.root;

    while (route) {
      if (route.snapshot.data?.['hideToolbar'] === true) {
        return true;
      }

      route = route.firstChild ?? null;
    }

    return false;
  }
}
