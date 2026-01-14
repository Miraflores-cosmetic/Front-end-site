import { graphqlRequest } from '@/graphql/client';

export interface FavoriteProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  variantId?: string;
}

// Получить избранные товары из metadata пользователя
export async function getFavorites(): Promise<FavoriteProduct[]> {
  const query = `
    query GetFavorites {
      me {
        id
        metadata {
          key
          value
        }
      }
    }
  `;

  const data = await graphqlRequest<any>(query);
  
  // Ищем metadata с ключом "favorites"
  const favoritesMeta = data.me?.metadata?.find((m: any) => m.key === 'favorites');
  
  if (!favoritesMeta || !favoritesMeta.value) {
    return [];
  }

  try {
    const favoriteIds = JSON.parse(favoritesMeta.value);
    
    // Получаем товары по ID
    const productsQuery = `
      query GetFavoriteProducts($ids: [ID!]!, $channel: String!) {
        products(first: 100, channel: $channel, filter: { ids: $ids }) {
          edges {
            node {
              id
              name
              slug
              thumbnail {
                url
              }
              defaultVariant {
                id
                name
                pricing {
                  price {
                    gross {
                      amount
                    }
                  }
                  priceUndiscounted {
                    gross {
                      amount
                    }
                  }
                  discount {
                    gross {
                      amount
                    }
                  }
                }
              }
              productVariants(first: 1) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;

    const productsData = await graphqlRequest<any>(productsQuery, {
      ids: favoriteIds,
      channel: 'miraflores-site'
    });

    return productsData.products.edges.map((edge: any) => {
      const node = edge.node;
      const variant = node.defaultVariant || node.productVariants?.edges?.[0]?.node;
      const price = variant?.pricing?.price?.gross?.amount || 0;
      const oldPrice = variant?.pricing?.priceUndiscounted?.gross?.amount;
      const discountAmount = variant?.pricing?.discount?.gross?.amount;
      
      let discount: number | undefined;
      if (oldPrice && oldPrice > price) {
        discount = Math.round(((oldPrice - price) / oldPrice) * 100);
      }

      return {
        id: node.id,
        name: node.name,
        slug: node.slug,
        thumbnail: node.thumbnail?.url,
        price,
        oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
        discount,
        variantId: variant?.id || node.productVariants?.edges?.[0]?.node?.id || node.id
      };
    });
  } catch (error) {
    console.error('Error parsing favorites:', error);
    return [];
  }
}

// Добавить товар в избранное
export async function addToFavorites(productId: string): Promise<boolean> {
  const favorites = await getFavorites();
  const favoriteIds = favorites.map(f => f.id);
  
  if (favoriteIds.includes(productId)) {
    return true; // Уже в избранном
  }

  favoriteIds.push(productId);

  const mutation = `
    mutation UpdateFavorites($input: AccountInput!) {
      accountUpdate(input: $input) {
        user {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

  try {
    await graphqlRequest<any>(mutation, {
      input: {
        metadata: [
          {
            key: 'favorites',
            value: JSON.stringify(favoriteIds)
          }
        ]
      }
    });
    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
}

// Удалить товар из избранного
export async function removeFromFavorites(productId: string): Promise<boolean> {
  const favorites = await getFavorites();
  const favoriteIds = favorites.map(f => f.id).filter(id => id !== productId);

  const mutation = `
    mutation UpdateFavorites($input: AccountInput!) {
      accountUpdate(input: $input) {
        user {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

  try {
    await graphqlRequest<any>(mutation, {
      input: {
        metadata: [
          {
            key: 'favorites',
            value: JSON.stringify(favoriteIds)
          }
        ]
      }
    });
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
}

// Проверить, находится ли товар в избранном
export async function isFavorite(productId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(f => f.id === productId);
}

// Очистить все избранное
export async function clearAllFavorites(): Promise<boolean> {
  const mutation = `
    mutation ClearFavorites($input: AccountInput!) {
      accountUpdate(input: $input) {
        user {
          id
        }
        errors {
          field
          message
        }
      }
    }
  `;

  try {
    await graphqlRequest<any>(mutation, {
      input: {
        metadata: [
          {
            key: 'favorites',
            value: JSON.stringify([])
          }
        ]
      }
    });
    return true;
  } catch (error) {
    console.error('Error clearing favorites:', error);
    return false;
  }
}

