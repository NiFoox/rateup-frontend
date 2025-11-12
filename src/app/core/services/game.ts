import { Injectable } from '@angular/core';
import { Observable, of, throwError, delay } from 'rxjs';
import { uid } from '../../shared/utils/random';
import { Game } from './game.model';

const GAMES_STORAGE_KEY = 'app.games';

@Injectable({ providedIn: 'root' })
export class GamesService {

  constructor() {
    this.ensureSeedData();
  }

  list(): Observable<Game[]> {
    return this.wrapResult(this.loadGames());
  }

  get(id: string): Observable<Game> {
    const game = this.loadGames().find(g => g.id === id);

    if (!game) {
      return this.wrapError(404, 'Juego no encontrado.');
    }

    return this.wrapResult(game);
  }

  create(payload: Omit<Game, 'id'>): Observable<Game> {
    const games = this.loadGames();

    const newGame: Game = {
      ...payload,
      id: uid('g')
    };

    this.saveGames([...games, newGame]);

    return this.wrapResult(newGame);
  }

  update(id: string, payload: Partial<Omit<Game, 'id'>>): Observable<Game> {
    const games = this.loadGames();
    const index = games.findIndex(g => g.id === id);

    if (index === -1) return this.wrapError(404, 'Juego no encontrado.');

    const updatedGame: Game = {
      ...games[index],
      ...payload
    }

    games[index] = updatedGame;
    this.saveGames(games);

    return this.wrapResult(updatedGame);
  }

  remove(id: string): Observable<void> {
    const games = this.loadGames();
    const next = games.filter(g => g.id !== id);

    if (games.length === next.length) return this.wrapError(404, 'Juego no encontrado.');

    this.saveGames(next);
    return this.wrapResult(void 0);
  }


private ensureSeedData(): void {
  const existing = window.localStorage.getItem(GAMES_STORAGE_KEY);
  if (existing) return;

  const seed: Game[] = [
    { id: uid('g'), name: 'God of War', description: 'Aventura épica nórdica', genre: 'Acción' },
    { id: uid('g'), name: 'Zelda BOTW', description: 'Exploración y mundo abierto en Hyrule', genre: 'Aventura' },
    { id: uid('g'), name: 'Hollow Knight', description: 'Metroidvania desafiante en Hallownest', genre: 'Metroidvania' },
    { id: uid('g'), name: 'Elden Ring', description: 'Open world hardcore soulslike', genre: 'RPG Acción' },
    { id: uid('g'), name: 'Red Dead Redemption 2', description: 'Epic western open world inmersivo', genre: 'Mundo Abierto' },
  ];

  this.saveGames(seed);
}

private loadGames(): Game[] {
    const raw = window.localStorage.getItem(GAMES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Game[];
  }

  private saveGames(games: Game[]): void {
    window.localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
  }

  private wrapResult<T>(value: T): Observable<T> {
    return of(value).pipe(delay(300));
  }

  private wrapError(status: number, message: string): Observable<never> {
    return throwError(() => ({ status, message })).pipe(delay(300));
  }
}

