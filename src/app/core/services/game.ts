import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Game {
  id?: number;
  name: string;
  description: string;
  genre: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000'; // o env

  list() {
    return this.http.get<Game[]>(`${this.baseUrl}/games`); // GET /games
  }

  create(game: Omit<Game, 'id'>) {
    return this.http.post(`${this.baseUrl}/games`, game);  // POST /games
  }
}
