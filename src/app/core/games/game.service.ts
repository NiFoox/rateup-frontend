import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Game } from './game.model';

type GamePayload = Omit<Game, 'id'>;

type GameDto = {
  id: string;
  name: string;
  description: string;
  genre: string;
};

type PaginatedGamesDto = {
  page: number;
  limit: number;
  data: GameDto[];
};

export type GamesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  all?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class GamesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/games`;

  list(query: GamesQuery = { all: true }): Observable<{ items: Game[]; page: number; pageSize: number }> {
    const params = new HttpParams({
      fromObject: {
        page: query.page ?? '',
        limit: query.limit ?? '',
        search: query.search ?? '',
        genre: query.genre ?? '',
        all: query.all === undefined ? '' : String(query.all)
      }
    });

    return this.http.get<GameDto[] | PaginatedGamesDto>(this.apiUrl, { params }).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          const items = response.map((dto) => this.mapGame(dto));
          return { items, page: 1, pageSize: items.length };
        }

        const items = response.data.map((dto) => this.mapGame(dto));
        return { items, page: response.page, pageSize: response.limit };
      })
    );
  }

  getById(id: string): Observable<Game> {
    return this.http.get<GameDto>(`${this.apiUrl}/${id}`).pipe(map((dto) => this.mapGame(dto)));
  }

  create(payload: GamePayload): Observable<Game> {
    return this.http.post<GameDto>(this.apiUrl, payload).pipe(map((dto) => this.mapGame(dto)));
  }

  update(id: string, payload: Partial<GamePayload>): Observable<Game> {
    return this.http
      .patch<GameDto>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((dto) => this.mapGame(dto)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private mapGame(dto: GameDto): Game {
    return {
      id: String(dto.id),
      name: dto.name,
      description: dto.description,
      genre: dto.genre
    } satisfies Game;
  }
}
