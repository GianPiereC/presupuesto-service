/**
 * Tipos relacionados con autenticación
 */

export interface User {
  id: string;
  nombresA: string;
  usuario: string;
  email?: string;
  role?: {
    id: string;
    nombre: string;
  };
}

export interface LoginCredentials {
  usuario: string;
  contrasenna: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  usuario: User;
}

export interface TokenValidation {
  isValid: boolean;
}








