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
  userVote?: -1 | 0 | 1;
  comments: number;
  createdAt: string;
  updatedAt?: string;
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
