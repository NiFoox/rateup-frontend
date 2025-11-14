# API Contracts Inventory

## Resumen
- **Servicios analizados:** 3 (AuthService, UsersService, ReviewsService)
- **Endpoints únicos:** 11
- **Recursos detectados:** `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/users`, `/api/users/:id`, `/api/users/:id/status`, `/api/reviews`, `/api/reviews/:id`, `/api/reviews/:reviewId/votes`, `/api/reviews/:reviewId/comments`, `/api/reviews/:reviewId/comments/:commentId`

**Checklist de verificación manual**
- [ ] `GET /api/...` responde con 200 y estructura esperada
- [ ] Paginación `page` + `limit`
- [ ] Orden `sort` + `dir` donde aplique
- [ ] Campos requeridos en `POST`/`PUT`
- [ ] `PagedResult` consistente (`items`, `total`, `page`, `pageSize`)

---

## AuthService (`src/app/core/auth/auth.service.ts`)

**Base URL:** `http://localhost:3000/api/auth`

| Method | HTTP | Path | Path Params | Query Params | Request Body | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `login` | POST | `/api/auth/login` | — | — | <pre><code>ts
{
  email: string;
  password: string;
  remember?: boolean;
}
</code></pre> | <pre><code>ts
{
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}
</code></pre> | Guarda tokens y usuario en `TokenStorageService`. |
| `logout` | POST | `/api/auth/logout` | — | — | <pre><code>ts
{}
</code></pre> | `void` | Siempre envía cuerpo vacío; errores se ignoran. |
| `me` | GET | `/api/auth/me` | — | — | — | <pre><code>ts
{
  user: AuthUser;
}
</code></pre> | Devuelve el perfil actual; en caso de error limpia sesión. |

### Modelos usados
```ts
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}
```

### Ejemplos cURL
```bash
curl -X POST 'http://localhost:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret","remember":true}'

curl -X POST 'http://localhost:3000/api/auth/logout' \
  -H 'Content-Type: application/json' \
  -d '{}'

curl -X GET 'http://localhost:3000/api/auth/me'
```

---

## UsersService (`src/app/core/users/users.service.ts`)

**Base URL:** `http://localhost:3000/api/users`

| Method | HTTP | Path | Path Params | Query Params | Request Body | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `list` | GET | `/api/users` | — | `page` (number), `limit` (number), `search?` (string), `sort?` (`keyof User`), `dir?` (`'asc' \| 'desc'`), `role?` (string), `active?` (boolean) | — | <pre><code>ts
PagedResult<User>
</code></pre> | `limit` proviene de `pageSize`. Los opcionales se envían como cadena vacía cuando no hay valor. |
| `get` | GET | `/api/users/:id` | `id: string` | — | — | `User` | — |
| `create` | POST | `/api/users` | — | — | <pre><code>ts
{
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  password?: string;
}
</code></pre> | `User` | `password` es opcional para altas administradas. |
| `update` | PUT | `/api/users/:id` | `id: string` | — | <pre><code>ts
Partial<{
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  password?: string;
}>
</code></pre> | `User` | Se envían solo los campos que cambian. |
| `remove` | DELETE | `/api/users/:id` | `id: string` | — | — | `void` | — |
| `setStatus` | PATCH | `/api/users/:id/status` | `id: string` | — | <pre><code>ts
{ active: boolean }
</code></pre> | `User` | Cambia el flag `active`. |

### Modelos usados
```ts
export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### Ejemplos cURL
```bash
curl -G 'http://localhost:3000/api/users' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=20' \
  --data-urlencode 'search=alice' \
  --data-urlencode 'sort=name' \
  --data-urlencode 'dir=asc' \
  --data-urlencode 'role=admin' \
  --data-urlencode 'active=true'

curl -X GET 'http://localhost:3000/api/users/USER_ID'

curl -X POST 'http://localhost:3000/api/users' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","roles":["admin"],"active":true,"password":"P@ssw0rd"}'

curl -X PUT 'http://localhost:3000/api/users/USER_ID' \
  -H 'Content-Type: application/json' \
  -d '{"roles":["editor"],"active":false}'

curl -X DELETE 'http://localhost:3000/api/users/USER_ID'

curl -X PATCH 'http://localhost:3000/api/users/USER_ID/status' \
  -H 'Content-Type: application/json' \
  -d '{"active":true}'
```

---

## ReviewsService (`src/app/core/reviews/reviews.service.ts`)

**Base URL:** `http://localhost:3000/api/reviews`

| Method | HTTP | Path | Path Params | Query Params | Request Body | Response | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `list` | GET | `/api/reviews` | — | `page` (number), `limit` (number), `search?` (string), `tag?` (string), `game?` (string), `sort?` (`'hot' \| 'new' \| 'top'`) | — | <pre><code>ts
PagedResult<ReviewWithUserVote>
</code></pre> | También actualiza filtros locales con tags y games recibidos. |
| `getById` | GET | `/api/reviews/:id` | `id: string` | — | — | `ReviewWithUserVote` | — |
| `vote` | POST | `/api/reviews/:reviewId/votes` | `reviewId: string` | — | <pre><code>ts
{ value: -1 | 0 | 1 }
</code></pre> | <pre><code>ts
{
  review: Review;
  userVote: -1 | 0 | 1;
}
</code></pre> | El backend puede devolver `userVote` nulo; se normaliza a `0`. |
| `getComments` | GET | `/api/reviews/:reviewId/comments` | `reviewId: string` | `page` (number), `limit` (number) | — | <pre><code>ts
PagedResult<Comment>
</code></pre> | `limit` corresponde al `pageSize` que usa el front. |
| `addComment` | POST | `/api/reviews/:reviewId/comments` | `reviewId: string` | — | <pre><code>ts
{ body: string }
</code></pre> | `Comment` | `_userId` y `_authorName` son argumentos no usados; el backend determina autor real. |
| `editComment` | PATCH | `/api/reviews/:reviewId/comments/:commentId` | `reviewId: string`, `commentId: string` | — | <pre><code>ts
{ body: string }
</code></pre> | `Comment` | — |
| `deleteComment` | DELETE | `/api/reviews/:reviewId/comments/:commentId` | `reviewId: string`, `commentId: string` | — | — | `void` | — |

### Modelos usados
```ts
export interface Review {
  id: string;
  title: string;
  game: string;
  authorId: string;
  authorName: string;
  tags: string[];
  rating: number;
  body: string;
  votes: number;
  comments: number;
  createdAt: string;
  updatedAt?: string;
}

export type VoteValue = -1 | 0 | 1;

export interface Comment {
  id: string;
  reviewId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  votes?: number;
}

export interface ReviewWithUserVote extends Review {
  userVote: VoteValue;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### Ejemplos cURL
```bash
curl -G 'http://localhost:3000/api/reviews' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=10' \
  --data-urlencode 'search=roguelike' \
  --data-urlencode 'tag=indie' \
  --data-urlencode 'game=Hades' \
  --data-urlencode 'sort=hot'

curl -X GET 'http://localhost:3000/api/reviews/REVIEW_ID'

curl -X POST 'http://localhost:3000/api/reviews/REVIEW_ID/votes' \
  -H 'Content-Type: application/json' \
  -d '{"value":1}'

curl -G 'http://localhost:3000/api/reviews/REVIEW_ID/comments' \
  --data-urlencode 'page=1' \
  --data-urlencode 'limit=25'

curl -X POST 'http://localhost:3000/api/reviews/REVIEW_ID/comments' \
  -H 'Content-Type: application/json' \
  -d '{"body":"Gran reseña"}'

curl -X PATCH 'http://localhost:3000/api/reviews/REVIEW_ID/comments/COMMENT_ID' \
  -H 'Content-Type: application/json' \
  -d '{"body":"Edición del comentario"}'

curl -X DELETE 'http://localhost:3000/api/reviews/REVIEW_ID/comments/COMMENT_ID'
```

---

## Convenciones
- **Base URL:** todas las rutas parten de `http://localhost:3000` definido como `environment.apiBaseUrl`.
- **Paginación:** siempre se envían los parámetros `page` (1-based) y `limit` (deriva de `pageSize`). No se observaron defaults explícitos en el frontend.
- **Ordenamiento:** usuarios usan `sort` (campo de `User`) y `dir` (`asc` \| `desc`). Reseñas usan `sort` con valores literales `'hot'`, `'new'`, `'top'`.
- **Filtros:**
  - Usuarios: `search` (texto), `role` (string), `active` (boolean serializado como `true`/`false`).
  - Reseñas: `search`, `tag`, `game` (strings).
- **Cuerpos JSON:** todos los `POST`/`PUT`/`PATCH` envían `Content-Type: application/json` y objetos estrictos según las interfaces anteriores.

## Ambigüedades/Dependencias
1. **Normalización de votos:** `vote` espera que el backend devuelva `{ review: ReviewDto; userVote?: VoteValue | null }`. El servicio fuerza `userVote` a `-1`, `0` o `1`, asumiendo que `null`/`undefined` indican voto ausente.
2. **Query `active` en usuarios:** se envía como cadena vacía cuando es `undefined`. Se asume que el backend interpreta `''` como "sin filtro" y `true`/`false` como booleanos válidos.
3. **Logout sincrónico:** `logout` ignora errores (con `catchError(() => of(void 0))`). Se asume que el backend puede responder con cualquier código; el front no reintenta.
