/**
 * Queries GraphQL para Autenticación
 */

export const VALIDATE_TOKEN_QUERY = `
  query ValidateToken {
    validateToken {
      isValid
    }
  }
`;

