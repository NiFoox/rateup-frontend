export interface Review {
  id: string;
  gameId: string;
  userId: string;
  content: string;
  score: number;
  votes: number;
  comments: number;
  createdAt: string;
  updatedAt?: string;
  game?: {
    id: string;
    name: string;
    genre?: string;
  };
  user?: {
    id: string;
    username: string;
    email?: string;
  };
}

export type VoteValue = -1 | 0 | 1;

export interface ReviewVote {
  reviewId: string;
  userId: string;
  value: VoteValue;
  updatedAt: string;
}

export interface Comment {
  id: string;
  reviewId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  votes?: number;
}

export interface ReviewsQuery {
  page: number;
  pageSize: number;
  gameId?: string;
  userId?: string;
  search?: string;
  tag?: string;
  game?: string;
  sort?: 'hot' | 'new' | 'top';
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewWithUserVote extends Review {
  userVote: VoteValue;
}
