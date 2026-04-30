/**
 * Единый URL GraphQL: в dev — относительный путь для прокси Vite, в prod — VITE_GRAPHQL_URL.
 * Обновление access token должно ходить сюда же, иначе в локальной разработке возможны CORS/расхождение с основными запросами.
 */
export function getGraphQLEndpoint(): string {
  if (import.meta.env.DEV) {
    return '/graphql/';
  }
  const endpoint = String(import.meta.env.VITE_GRAPHQL_URL || '');
  if (!endpoint) {
    throw new Error('VITE_GRAPHQL_URL is not defined');
  }
  return endpoint;
}
