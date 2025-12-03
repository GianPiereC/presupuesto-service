/**
 * Constantes de la aplicación
 */

export const API_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8085/graphql';

export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user';
export const SELECTED_ROLE_KEY = 'selectedRole';

export const TOKEN_EXPIRY_DAYS = 30;
export const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Configuración de React Query
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 30 * 60 * 1000, // 30 minutos
  retry: 1,
  refetchOnWindowFocus: false,
} as const;


