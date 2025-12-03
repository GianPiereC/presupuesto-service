import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from './constants';

/**
 * Utilidades para manejo de cookies del lado del servidor
 */

export async function getServerCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function getServerAuthToken(): Promise<string | undefined> {
  return getServerCookie(AUTH_COOKIE_NAME);
}








