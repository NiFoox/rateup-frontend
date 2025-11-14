import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Game {
  id?: number;
  name: string;
  description: string;
  genre: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  list(): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.baseUrl}/games`);
  }

  create(game: Omit<Game, 'id'>): Observable<Game> {
    return this.http.post<Game>(`${this.baseUrl}/games`, game);
  }

  getById(id: number): Observable<Game> {
    return this.http.get<Game>(`${this.baseUrl}/games/${id}`);
  }

  update(id: number, body: Partial<Omit<Game, 'id'>>): Observable<Game> {
    return this.http.put<Game>(`${this.baseUrl}/games/${id}`, body);
  }
}