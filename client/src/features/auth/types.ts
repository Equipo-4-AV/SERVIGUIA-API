export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export type LoginRequest = LoginCredentials;

export type RegisterRequest = RegisterCredentials;

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: "bearer" | string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: "bearer" | string;
}

export interface RegisterResponse {
  id: string;
  email: string;
}
