export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  roles: ('USER' | 'ADMIN')[];
}

export interface AuthResponse {
  success: true;
  accessToken: string;
  user: AuthUser;
  expiresAt: string;
}

export interface PrivateUserProfile extends AuthUser {
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
