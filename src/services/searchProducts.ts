import { CHANNEL, graphqlRequest } from '@/graphql/client';
import type { ProductNode } from '@/types/products';

export async function searchProducts(query: string): Promise<ProductNode[]> {
  // Пробуем сначала через search, если не работает - используем альтернативный подход
  const gql = `
    query SearchProducts($query: String!, $channel: String!) {
      products(
        first: 50
        channel: $channel
        filter: { search: $query }
      ) {
        edges {
          node {
            id
            name
            slug
            thumbnail { url }
            defaultVariant {
              id
              pricing {
                price {
                  gross { amount }
                }
                priceUndiscounted {
                  gross { amount }
                }
                discount {
                  gross { amount }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const variables = { query, channel: CHANNEL };
    const data = await graphqlRequest<any>(gql, variables);
    const results = data.products.edges.map((e: any) => e.node);
    
    // Если результатов нет, пробуем альтернативный поиск через name
    if (results.length === 0 && query.trim().length > 0) {
      // Используем поиск без filter.search - получаем все товары и фильтруем на клиенте
      // Это не идеально, но работает с кириллицей
      const allProductsQuery = `
        query SearchProductsAlt($channel: String!) {
          products(
            first: 100
            channel: $channel
          ) {
            edges {
              node {
                id
                name
                slug
                thumbnail { url }
                defaultVariant {
                  id
                  pricing {
                    price {
                      gross { amount }
                    }
                    priceUndiscounted {
                      gross { amount }
                    }
                    discount {
                      gross { amount }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const allData = await graphqlRequest<any>(allProductsQuery, { channel: CHANNEL });
      const allProducts = allData.products.edges.map((e: any) => e.node);
      
      // Фильтруем на клиенте по имени (case-insensitive)
      const searchLower = query.toLowerCase();
      return allProducts.filter((p: any) => 
        p.name.toLowerCase().includes(searchLower)
      ).slice(0, 20);
    }
    
    return results;
  } catch (error) {
    console.error('Search error:', error);
    // В случае ошибки возвращаем пустой массив
    return [];
  }
}
