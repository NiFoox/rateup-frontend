# Endpoints por archivo de servicio

## src/app/core/auth/auth.service.ts
- `login(request: LoginRequest)`: **POST** `/api/auth/login` → `AuthResponse`
- `logout()`: **POST** `/api/auth/logout` → `void`
- `me()`: **GET** `/api/auth/me` → `{ user: AuthUser }`

## src/app/core/users/users.service.ts
- `list(params: UserListParams)`: **GET** `/api/users?page&limit&search&sort&dir&role&active` → `PagedResult<User>`
- `get(id: string)`: **GET** `/api/users/:id` → `User`
- `create(payload: UserCreatePayload)`: **POST** `/api/users` → `User`
- `update(id: string, payload: UserUpdatePayload)`: **PUT** `/api/users/:id` → `User`
- `remove(id: string)`: **DELETE** `/api/users/:id` → `void`
- `setStatus(id: string, active: boolean)`: **PATCH** `/api/users/:id/status` → `User`

## src/app/core/reviews/reviews.service.ts
- `list(query: ReviewsQuery)`: **GET** `/api/reviews?page&limit&search&tag&game&sort` → `PagedResult<ReviewWithUserVote>`
- `getById(id: string)`: **GET** `/api/reviews/:id` → `ReviewWithUserVote`
- `vote(reviewId: string, value: VoteValue)`: **POST** `/api/reviews/:reviewId/votes` → `{ review: Review; userVote: VoteValue }`
- `getComments(reviewId: string, page: number, pageSize: number)`: **GET** `/api/reviews/:reviewId/comments?page&limit` → `PagedResult<Comment>`
- `addComment(reviewId: string, body: string)`: **POST** `/api/reviews/:reviewId/comments` → `Comment`
- `editComment(reviewId: string, commentId: string, body: string)`: **PATCH** `/api/reviews/:reviewId/comments/:commentId` → `Comment`
- `deleteComment(reviewId: string, commentId: string)`: **DELETE** `/api/reviews/:reviewId/comments/:commentId` → `void`
