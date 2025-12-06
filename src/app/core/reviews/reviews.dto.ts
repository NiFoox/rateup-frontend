export interface CommentDto {
  id: string;
  reviewId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user?: { id: string; username: string };
  userId?: string;
}

export interface ReviewDto {
  id: string;
  gameId: string;
  userId: string;
  content: string;
  score: number;
  createdAt: string;
  updatedAt?: string;
  user?: { id: string; username: string; email?: string };
  game?: { id: string; name: string; genre?: string };
  votes?: VoteSummaryDto;
  comments?: number;
  userVote?: number | null;
}

export interface ReviewWithRelationsDto extends ReviewDto {
  game: { id: string; name: string; genre: string };
  user: { id: string; username: string; email?: string };
}

export interface VoteSummaryDto {
  reviewId: string;
  upvotes: number;
  downvotes: number;
  score: number;
  // userVote?: number | null;
}

export interface CommentsPageDto<T> {
  page: number;
  pageSize: number;
  data?: T[];
  items?: T[];
  count?: number;
  total?: number;
}

export interface ReviewFullDto {
  reviewId: string;
  review: ReviewWithRelationsDto;
  comments: CommentsPageDto<CommentDto>;
  votes: VoteSummaryDto;
  userVote?: number | null;
}
