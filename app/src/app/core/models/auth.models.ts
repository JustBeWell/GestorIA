export interface AuthUser {
  id: string;
  nombre_usuario: string;
  role: string;
}

export interface LoginRequest {
  dni: string;
  password: string;
}

/**
 * Respuesta unificada del endpoint POST /auth/login.
 * - Si requires_2fa = true  → mostrar paso OTP (usar session_id).
 * - Si requires_2fa = false → token JWT disponible directamente.
 */
export interface LoginResponse {
  requires_2fa: boolean;
  session_id?: string;
  access_token?: string;
  token_type: string;
  expires_in?: number;
  user?: AuthUser;
}

export interface OtpVerifyRequest {
  session_id: string;
  code: string;
}
