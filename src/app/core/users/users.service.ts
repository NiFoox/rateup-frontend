import { Injectable } from '@angular/core';
import { Observable, of, throwError, delay } from 'rxjs';

import { randomDelay, uid } from '../../shared/utils/random';
import { PagedResult, User } from './users.models';

const USERS_STORAGE_KEY = 'app.users';
const DEMO_USER_ID = 'u-1';
const DEMO_EMAIL = 'demo@demo.com';

type SortDirection = 'asc' | 'desc';

type UserCreatePayload = Omit<User, 'id' | 'createdAt'> & { password?: string };
type UserUpdatePayload = Partial<Omit<User, 'id' | 'createdAt'>>;

class UsersMockError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor() {
    this.ensureSeedData();
  }

  list(params: {
    page: number;
    pageSize: number;
    search?: string;
    sort?: keyof User;
    dir?: SortDirection;
    role?: string;
    active?: boolean;
  }): Observable<PagedResult<User>> {
    const users = this.loadUsers();
    const filtered = this.applyFilters(users, params);
    const sorted = this.applySort(filtered, params.sort, params.dir);
    const paged = this.applyPagination(sorted, params.page, params.pageSize);

    const result: PagedResult<User> = {
      items: paged,
      total: filtered.length,
      page: params.page,
      pageSize: params.pageSize
    };

    return this.wrapResult(result);
  }

  get(id: string): Observable<User> {
    const user = this.loadUsers().find((item) => item.id === id);

    if (!user) {
      return this.wrapError(404, 'Usuario no encontrado.');
    }

    return this.wrapResult(user);
  }

  create(payload: UserCreatePayload): Observable<User> {
    const users = this.loadUsers();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const emailExists = users.some((user) => user.email.toLowerCase() === normalizedEmail);

    if (emailExists) {
      return this.wrapError(409, 'El email ya está en uso.');
    }

    const newUser: User = {
      id: uid('u'),
      name: payload.name.trim(),
      email: normalizedEmail,
      roles: [...payload.roles],
      active: payload.active,
      createdAt: new Date().toISOString()
    };

    this.saveUsers([...users, newUser]);

    return this.wrapResult(newUser);
  }

  update(id: string, payload: UserUpdatePayload): Observable<User> {
    if (payload.roles === undefined || payload.active === undefined) {
      return this.wrapError(400, 'Roles y estado activo son obligatorios.');
    }

    const users = this.loadUsers();
    const index = users.findIndex((item) => item.id === id);

    if (index === -1) {
      return this.wrapError(404, 'Usuario no encontrado.');
    }

    const email = payload.email?.trim().toLowerCase();

    if (email && users.some((user, position) => position !== index && user.email === email)) {
      return this.wrapError(409, 'El email ya está en uso.');
    }

    const updatedUser: User = {
      ...users[index],
      ...payload,
      email: email ?? users[index].email,
      roles: [...payload.roles],
      active: payload.active
    };

    const nextUsers = [...users];
    nextUsers[index] = updatedUser;
    this.saveUsers(nextUsers);

    return this.wrapResult(updatedUser);
  }

  remove(id: string): Observable<void> {
    const users = this.loadUsers();
    const nextUsers = users.filter((user) => user.id !== id);

    if (users.length === nextUsers.length) {
      return this.wrapError(404, 'Usuario no encontrado.');
    }

    this.saveUsers(nextUsers);

    return this.wrapResult(void 0);
  }

  setStatus(id: string, active: boolean): Observable<User> {
    const users = this.loadUsers();
    const index = users.findIndex((user) => user.id === id);

    if (index === -1) {
      return this.wrapError(404, 'Usuario no encontrado.');
    }

    const updatedUser: User = {
      ...users[index],
      active
    };

    const nextUsers = [...users];
    nextUsers[index] = updatedUser;
    this.saveUsers(nextUsers);

    return this.wrapResult(updatedUser);
  }

  findByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    return this.loadUsers().find((user) => user.email === normalized);
  }

  private applyFilters(
    users: User[],
    params: { search?: string; role?: string; active?: boolean }
  ): User[] {
    const searchTerm = params.search?.trim().toLowerCase();
    const role = params.role?.toLowerCase();
    const active = params.active;

    return users.filter((user) => {
      const matchesSearch = searchTerm
        ? user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
        : true;
      const matchesRole = role
        ? user.roles.some((value) => value.toLowerCase() === role)
        : true;
      const matchesActive = typeof active === 'boolean' ? user.active === active : true;

      return matchesSearch && matchesRole && matchesActive;
    });
  }

  private applySort(users: User[], sort?: keyof User, direction: SortDirection = 'desc'): User[] {
    const sorted = [...users];
    const key = sort ?? 'createdAt';
    const dir = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      const valueA = this.sortableValue(a[key]);
      const valueB = this.sortableValue(b[key]);

      if (valueA < valueB) {
        return -1 * dir;
      }

      if (valueA > valueB) {
        return 1 * dir;
      }

      return 0;
    });

    return sorted;
  }

  private applyPagination(users: User[], page: number, pageSize: number): User[] {
    const start = page * pageSize;
    return users.slice(start, start + pageSize);
  }

  private sortableValue(value: unknown): number | string {
    if (Array.isArray(value)) {
      return value.join(',').toLowerCase();
    }

    if (typeof value === 'string') {
      const timestamp = Date.parse(value);
      return Number.isNaN(timestamp) ? value.toLowerCase() : timestamp;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return typeof value === 'number' ? value : String(value ?? '').toLowerCase();
  }

  private ensureSeedData(): void {
    if (!this.isBrowser()) {
      return;
    }

    const existing = window.localStorage.getItem(USERS_STORAGE_KEY);

    if (existing) {
      return;
    }

    const seedUsers: User[] = [
      {
        id: DEMO_USER_ID,
        name: 'Demo Admin',
        email: DEMO_EMAIL,
        roles: ['admin'],
        active: true,
        createdAt: new Date().toISOString()
      },
      ...this.generateSampleUsers()
    ];

    this.saveUsers(seedUsers);
  }

  private generateSampleUsers(): User[] {
    const now = Date.now();
    const samples: Array<[string, string, string[], boolean]> = [
      ['Lucía Fernández', 'lucia.fernandez@example.com', ['editor'], true],
      ['Martín Herrera', 'martin.herrera@example.com', ['viewer'], true],
      ['Sofía Ramírez', 'sofia.ramirez@example.com', ['editor', 'viewer'], false],
      ['Julián Torres', 'julian.torres@example.com', ['viewer'], true],
      ['Valentina Díaz', 'valentina.diaz@example.com', ['admin'], true],
      ['Camila Pérez', 'camila.perez@example.com', ['viewer'], false],
      ['Felipe González', 'felipe.gonzalez@example.com', ['editor'], true],
      ['Carolina Molina', 'carolina.molina@example.com', ['admin', 'editor'], true],
      ['Agustina López', 'agustina.lopez@example.com', ['viewer'], true],
      ['Rodrigo Castro', 'rodrigo.castro@example.com', ['editor'], false],
      ['Abril Sánchez', 'abril.sanchez@example.com', ['viewer'], true],
      ['Tomás Cabrera', 'tomas.cabrera@example.com', ['editor', 'viewer'], true]
    ];

    return samples.map((sample, index) => {
      const [name, email, roles, active] = sample;
      const createdAt = new Date(now - index * 86_400_000).toISOString();

      return {
        id: uid('u'),
        name,
        email,
        roles,
        active,
        createdAt
      } satisfies User;
    });
  }

  private loadUsers(): User[] {
    if (!this.isBrowser()) {
      return [];
    }

    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as User[];
      return parsed.map((user) => ({
        ...user,
        roles: [...user.roles]
      }));
    } catch {
      window.localStorage.removeItem(USERS_STORAGE_KEY);
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    if (!this.isBrowser()) {
      return;
    }

    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private wrapResult<T>(value: T): Observable<T> {
    return of(value).pipe(delay(randomDelay()));
  }

  private wrapError(status: number, message: string): Observable<never> {
    return throwError(() => new UsersMockError(status, message)).pipe(delay(randomDelay()));
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}
