export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
}

export interface AuthUser {
  id?: number | string;
  userId?: string;
  sessionId?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export interface CurrentUserResponse {
  user: AuthUser;
}
