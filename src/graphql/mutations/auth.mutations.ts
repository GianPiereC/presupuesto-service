/**
 * Mutations GraphQL para Autenticación
 */

export const LOGIN_MUTATION = `
  mutation Login($usuario: String!, $contrasenna: String!) {
    login(usuario: $usuario, contrasenna: $contrasenna) {
      token
      refreshToken
      usuario {
        id
        nombresA
        usuario
        email
        role {
          id
          nombre
        }
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
    }
  }
`;

