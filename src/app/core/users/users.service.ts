import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AppRole, PagedResult, PublicUserProfile, User } from './users.models';

type UserCreatePayload = {
  username: string;
  email: string;
  password: string;
  roles: AppRole[];
  isActive: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
};

type UserUpdatePayload = Partial<{
  username: string;
  email: string;
  password: string;
  isActive: boolean;
  avatarUrl: string | null;
  bio: string | null;
}>;

type UserListParams = {
  page: number;
  pageSize: number;
  search?: string;
};

interface UserDto {
  id: number;
  username: string;
  email: string;
  roles: AppRole[];
  isActive: boolean;
  avatarUrl: string | null;
  bio: string | null;
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
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('pageSize', String(params.pageSize));

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http
      .get<PagedResultDto<UserDto>>(this.apiUrl, { params: httpParams })
      .pipe(
        map((result) => ({
          data: result.data.map((dto) => this.mapUser(dto)),
          total: result.total,
          page: result.page,
          pageSize: result.pageSize
        }))
      );
  }

  getById(id: number): Observable<User> {
    return this.http
      .get<UserDto>(`${this.apiUrl}/${id}`)
      .pipe(map((dto) => this.mapUser(dto)));
  }

  create(payload: UserCreatePayload): Observable<User> {
    return this.http
      .post<UserDto>(this.apiUrl, payload)
      .pipe(map((dto) => this.mapUser(dto)));
  }

  update(id: number, payload: UserUpdatePayload): Observable<User> {
    return this.http
      .patch<UserDto>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((dto) => this.mapUser(dto)));
  }

  setStatus(id: number, active: boolean): Observable<User> {
    return this.http
      .patch<UserDto>(`${this.apiUrl}/${id}`, { isActive: active })
      .pipe(map((dto) => this.mapUser(dto)));
  }

  updateRoles(id: number, roles: AppRole[]): Observable<User> {
    return this.http
      .patch<UserDto>(`${this.apiUrl}/${id}/roles`, { roles })
      .pipe(map((dto) => this.mapUser(dto)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getPublicProfile(id: number): Observable<PublicUserProfile> {
    return this.http.get<PublicUserProfile>(`${this.apiUrl}/profile/${id}`);
  }

  private mapUser(dto: UserDto): User {
    return {
      id: dto.id,
      username: dto.username,
      email: dto.email,
      roles: dto.roles,
      isActive: dto.isActive,
      avatarUrl: dto.avatarUrl,
      bio: dto.bio,
      createdAt: new Date(dto.createdAt).toISOString()
    } satisfies User;
  }
}
