import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Game } from './game.model';

type GamePayload = Omit<Game, 'id'>;

type GameDto = {
  id: number | string;
  name: string;
  description: string;
  genre: string;
};

type PaginatedGamesDto = {
  page: number;
  limit: number;
  total: number;
  data: GameDto[];
};

export type GamesPageResult = {
  items: Game[];
  page: number;
  pageSize: number;
  total: number;
};

export type GamesListFilters = {
  search?: string;
  genre?: string;
};

@Injectable({ providedIn: 'root' })
export class GamesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/games`;

  // Lista todos los juegos
  listAll(filters?: GamesListFilters): Observable<Game[]> {
    let params = new HttpParams().set('all', true);

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.genre) {
      params = params.set('genre', filters.genre);
    }

    return this.http
      .get<GameDto[]>(this.apiUrl, { params })
      .pipe(map((dtos) => dtos.map((dto) => this.mapGame(dto))));
  }

  //Lista juegos en modo paginado.
  listPage(params: {
    page?: number;
    limit?: number;
    search?: string;
    genre?: string;
  }): Observable<GamesPageResult> {
    let httpParams = new HttpParams();

    if (params.page != null) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params.limit != null) {
      httpParams = httpParams.set('limit', params.limit);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.genre) {
      httpParams = httpParams.set('genre', params.genre);
    }

    return this.http
      .get<PaginatedGamesDto>(this.apiUrl, { params: httpParams })
      .pipe(
        map((dto) => ({
          items: dto.data.map((g) => this.mapGame(g)),
          page: dto.page,
          pageSize: dto.limit,
          total: dto.total
        }))
      );
  }

  getById(id: string): Observable<Game> {
    return this.http
      .get<GameDto>(`${this.apiUrl}/${id}`)
      .pipe(map((dto) => this.mapGame(dto)));
  }

  create(payload: GamePayload): Observable<Game> {
    return this.http
      .post<GameDto>(this.apiUrl, payload)
      .pipe(map((dto) => this.mapGame(dto)));
  }

  update(id: string, payload: GamePayload): Observable<Game> {
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
