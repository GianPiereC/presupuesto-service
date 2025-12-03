import Cookies from 'js-cookie';
import { AUTH_COOKIE_NAME } from './constants';

/**
 * Utilidades para manejo de cookies del lado del cliente
 */

export function getCookie(name: string): string | undefined {
  return Cookies.get(name);
}

export function setCookie(name: string, value: string, days?: number): void {
  const options: Cookies.CookieAttributes = {
    path: '/',
    sameSite: 'lax',
  };

  if (days) {
    options.expires = days;
  }

  Cookies.set(name, value, options);
}

export function removeCookie(name: string): void {
  Cookies.remove(name, { path: '/' });
}

export function getAuthToken(): string | undefined {
  return getCookie(AUTH_COOKIE_NAME);
}

export function setAuthToken(token: string, days: number = 30): void {
  setCookie(AUTH_COOKIE_NAME, token, days);
}

export function removeAuthToken(): void {
  removeCookie(AUTH_COOKIE_NAME);
}








