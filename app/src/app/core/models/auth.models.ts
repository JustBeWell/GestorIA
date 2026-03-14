export interface AuthUser {
  id: string;
  nombre_usuario: string;
  role: string;
}

export interface LoginRequest {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}
