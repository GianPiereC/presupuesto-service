import { GraphQLClient } from 'graphql-request';
import { API_URL } from '@/lib/constants';
import { getAuthToken } from '@/lib/cookies';

/**
 * Cliente GraphQL configurado con autenticación
 */
export const graphqlClient = new GraphQLClient(API_URL, {
  headers: () => {
    const token = typeof window !== 'undefined' ? getAuthToken() : undefined;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },
});

/**
 * Ejecuta una query GraphQL
 */
export async function executeQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const data = await graphqlClient.request<T>(query, variables);
    return data;
  } catch (error) {
    console.error('GraphQL Error:', error);
    throw error;
  }
}

/**
 * Ejecuta una mutation GraphQL
 */
export async function executeMutation<T = any>(
  mutation: string,
  variables?: Record<string, any>
): Promise<T> {
  return executeQuery<T>(mutation, variables);
}








