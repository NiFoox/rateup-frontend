import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PagedResult, User } from './users.models';

type SortDirection = 'asc' | 'desc';

type UserCreatePayload = Omit<User, 'id' | 'createdAt'> & { password?: string };
type UserUpdatePayload = Partial<Omit<User, 'id' | 'createdAt'>>;

type UserListParams = {
  page: number;
  pageSize: number;
  search?: string;
  sort?: keyof User;
  dir?: SortDirection;
  role?: string;
  active?: boolean;
};

interface UserDto {
  id: string;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

interface PagedResultDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/users`;

  list(params: UserListParams): Observable<PagedResult<User>> {
    const httpParams = new HttpParams({
      fromObject: {
        page: params.page,
        limit: params.pageSize,
        search: params.search ?? '',
        sort: params.sort ?? '',
        dir: params.dir ?? '',
        role: params.role ?? '',
        active: params.active === undefined ? '' : String(params.active)
      }
    });

    return this.http
      .get<PagedResultDto<UserDto>>(this.apiUrl, { params: httpParams })
      .pipe(map((result) => this.mapPagedResult(result, (item) => this.mapUser(item))));
  }

  get(id: string): Observable<User> {
    return this.http.get<UserDto>(`${this.apiUrl}/${id}`).pipe(map((dto) => this.mapUser(dto)));
  }

  create(payload: UserCreatePayload): Observable<User> {
    return this.http
      .post<UserDto>(this.apiUrl, payload)
      .pipe(map((dto) => this.mapUser(dto)));
  }

  update(id: string, payload: UserUpdatePayload): Observable<User> {
    return this.http
      .put<UserDto>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((dto) => this.mapUser(dto)));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  setStatus(id: string, active: boolean): Observable<User> {
    return this.http
      .patch<UserDto>(`${this.apiUrl}/${id}/status`, { active })
      .pipe(map((dto) => this.mapUser(dto)));
  }

  private mapPagedResult<TDto, TModel>(
    dto: PagedResultDto<TDto>,
    mapItem: (item: TDto) => TModel
  ): PagedResult<TModel> {
    return {
      data: dto.data.map(mapItem),
      total: dto.total,
      page: dto.page,
      pageSize: dto.pageSize
    };
  }

  private mapUser(dto: UserDto): User {
    return {
      id: dto.id,
      username: dto.username,
      email: dto.email,
      roles: Array.isArray(dto.roles) ? [...dto.roles] : [],
      isActive: dto.isActive,
      createdAt: new Date(dto.createdAt).toISOString()
    } satisfies User;
  }
}
