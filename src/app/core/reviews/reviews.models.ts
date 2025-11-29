export interface Review {
  id: string;
  gameId: string;
  userId: string;
  content: string;
  score: number;
  voteSummary: VoteSummary;
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

export interface VoteSummary {
  reviewId: string;
  upvotes: number;
  downvotes: number;
  score: number;
}

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
  // Falta implementar en el backend
  search?: string;
  tag?: string;
  gameName?: string; 
  sort?: 'hot' | 'new' | 'top';
  days?: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewWithUserVote extends Review {
  userVote: VoteValue;
}
