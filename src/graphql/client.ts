export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export const CHANNEL = 'miraflores-site';
export const AVAILABILITY_COUNTRY_FOR_STOCK = 'RU';
export const RedirectUrl = 'http://localhost:5173/email-confirmation';

/** Saleor GraphQL отключён — все вызовы должны идти через @/api/*. */
export async function graphqlRequest<T>(
  _query: string,
  _variables: Record<string, unknown> = {},
): Promise<T> {
  throw new Error('Saleor GraphQL disabled — use Админ панель 2.0 API');
}
