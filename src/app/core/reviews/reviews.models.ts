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
  body: string;
  createdAt: string;
  updatedAt?: string;
  votes?: number;
}

export interface ReviewsQuery {
  page: number;
  pageSize: number;
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
