import { API_URL, AUTH_COOKIE_NAME, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_DAYS } from '@/lib/constants';
import { setAuthToken, removeAuthToken, getAuthToken } from '@/lib/cookies';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  usuario: {
    id: string;
    nombresA: string;
    usuario: string;
    role?: {
      id: string;
      nombre: string;
    };
  };
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

class AuthService {
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Inicia sesión con usuario y contraseña
   */
  async login(usuario: string, contrasenna: string): Promise<LoginResponse> {
    const query = `
      mutation Login($usuario: String!, $contrasenna: String!) {
        login(usuario: $usuario, contrasenna: $contrasenna) {
          id
          token
          usuario
          nombresA
          role {
            id
            nombre
          }
        }
      }
    `;

    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { usuario, contrasenna },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error('Error al procesar la respuesta del servidor');
      }

      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Error en el inicio de sesión');
      }

      const loginData = data.data.login;

      // Adaptar la respuesta del backend a la estructura esperada por el frontend
      const adaptedResponse: LoginResponse = {
        token: loginData.token,
        refreshToken: loginData.token, // Usar el mismo token como refresh token temporalmente
        usuario: {
          id: loginData.id,
          nombresA: loginData.nombresA,
          usuario: loginData.usuario,
          role: loginData.role,
        },
      };

      // Guardar token en cookie
      if (typeof window !== 'undefined') {
        setAuthToken(adaptedResponse.token, TOKEN_EXPIRY_DAYS);

        // Guardar refresh token en localStorage
        const refreshTokenData = {
          token: adaptedResponse.refreshToken,
          expiresAt: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        };
        localStorage.setItem(REFRESH_TOKEN_KEY, JSON.stringify(refreshTokenData));

        // Guardar usuario en localStorage
        localStorage.setItem('user', JSON.stringify(adaptedResponse.usuario));
      }

      return adaptedResponse;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Error en el inicio de sesión');
    }
  }

  /**
   * Refresca el token de autenticación
   * Nota: El backend no tiene implementado refreshToken, por lo que esta función
   * solo verifica si el token actual sigue siendo válido en localStorage
   */
  async refreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    // Verificar si hay un token guardado
    const token = getAuthToken();
    if (!token) return null;

    // Verificar si el refresh token ha expirado (si existe)
    const refreshTokenData = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshTokenData) {
      try {
        const parsedData = JSON.parse(refreshTokenData);
        const { expiresAt } = parsedData;
        
        if (expiresAt && new Date(expiresAt) < new Date()) {
          this.logout();
          return null;
        }
      } catch (parseError) {
        // Si hay error al parsear, continuar con el token actual
        console.warn('Error parsing refresh token data:', parseError);
      }
    }

    // Como no hay refreshToken en el backend, simplemente retornar el token actual
    // si existe y no ha expirado
    return token;
  }

  /**
   * Cierra sesión y limpia todos los datos de autenticación
   */
  logout(): void {
    if (typeof window === 'undefined') return;

    removeAuthToken();
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('selectedRole');
  }

  /**
   * Obtiene los headers de autenticación
   */
  getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? getAuthToken() : undefined;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Valida si el token actual es válido
   * Nota: El backend no tiene implementado validateToken, por lo que esta función
   * solo verifica si existe un token en localStorage y si hay datos de usuario
   */
  async validateToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const token = getAuthToken();
    if (!token) return false;

    // Verificar si hay datos de usuario guardados
    const userData = localStorage.getItem('user');
    if (!userData) return false;

    // Verificar si el refresh token ha expirado (si existe)
    const refreshTokenData = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshTokenData) {
      try {
        const parsedData = JSON.parse(refreshTokenData);
        const { expiresAt } = parsedData;
        
        if (expiresAt && new Date(expiresAt) < new Date()) {
          return false;
        }
      } catch (parseError) {
        // Si hay error al parsear, asumir que es válido si hay token
        console.warn('Error parsing refresh token data:', parseError);
      }
    }

    // Si hay token y datos de usuario, considerar válido
    // La validación real se hará cuando se intente usar el token en una petición
    return true;
  }
}

// Exportar instancia singleton
export const authService = new AuthService();


