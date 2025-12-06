export type AppRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  roles: AppRole[];
  isActive: boolean;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicUserProfile {
  id: number;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  stats: {
    reviewsCount: number;
    reputation: {
      upvotes: number;
      downvotes: number;
      score: number;
      likesRate: number;
    };
  };
}