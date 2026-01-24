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

const getUserId = () => localStorage.getItem('userId') || 'guest';
const getStorageKey = () => `favorites_${getUserId()}`;

const getLocalFavoriteIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

async function saveFavoriteIds(ids: string[]) {
  // 1. Save to LocalStorage
  const key = getStorageKey();
  localStorage.setItem(key, JSON.stringify(ids));

  // 2. Sync with Server REST API
  if (getUserId() !== 'guest') {
    try {
      // В development используем относительный путь для прокси Vite
      // В production используем полный URL
      const isDev = import.meta.env.DEV;
      let endpoint = '';
      
      if (isDev) {
        // В development используем относительный путь - Vite прокси обработает
        endpoint = '/api/favorites'; // Прокси добавит trailing slash
      } else {
        // В production используем полный URL
        const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || '';
        endpoint = graphqlUrl.replace('/graphql/', '/api/favorites/');
      }
      
      const token = localStorage.getItem('token');

      if (!token) return;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'set',
          favorites: ids
        })
      });
    } catch (error) {
      console.warn('Failed to sync favorites to server REST API:', error);
    }
  }
}

// Получить избранные товары
export async function getFavorites(): Promise<FavoriteProduct[]> {
  try {
    let favoriteIds = getLocalFavoriteIds();
    const token = localStorage.getItem('token');

    // Sync with REST API if user is logged in
    if (getUserId() !== 'guest' && token) {
      try {
        // В development используем относительный путь для прокси Vite
        // В production используем полный URL
        const isDev = import.meta.env.DEV;
        let endpoint = '';
        
        if (isDev) {
          // В development используем относительный путь - Vite прокси обработает
          endpoint = '/api/favorites'; // Прокси добавит trailing slash
        } else {
          // В production используем полный URL
          const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || '';
          endpoint = graphqlUrl.replace('/graphql/', '/api/favorites/');
        }
        
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const json = await res.json();
          const serverIds = json.favorites || [];

          if (Array.isArray(serverIds)) {
            // Объединяем локальные и серверные (уникальные)
            const merged = Array.from(new Set([...favoriteIds, ...serverIds]));

            const localMissing = merged.some(id => !favoriteIds.includes(id));
            const serverMissing = merged.some(id => !serverIds.includes(id));

            if (localMissing) {
              // Если локально чего-то не хватало - обновляем LS
              favoriteIds = merged;
              localStorage.setItem(getStorageKey(), JSON.stringify(favoriteIds));
            }

            if (serverMissing) {
              // Если на сервере чего-то не хватало - обновляем сервер
              saveFavoriteIds(merged);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch favorites from REST API', e);
      }
    }

    if (!favoriteIds || favoriteIds.length === 0) {
      return [];
    }

    // 2. Получаем варианты товаров по ID, затем получаем товары через варианты
    // В избранном хранятся ID вариантов (ProductVariant), а не товаров (Product)
    const variantsQuery = `
      query GetFavoriteVariants($ids: [ID!]!, $channel: String!) {
        productVariants(first: 100, channel: $channel, ids: $ids) {
          edges {
            node {
              id
              name
              pricing {
                price { gross { amount } }
                priceUndiscounted { gross { amount } }
                discount { gross { amount } }
              }
              product {
                id
                name
                slug
                thumbnail { url }
              }
            }
          }
        }
      }
    `;

    const variantsData = await graphqlRequest<any>(variantsQuery, {
      ids: favoriteIds,
      channel: 'miraflores-site'
    });

    if (!variantsData || !variantsData.productVariants || !variantsData.productVariants.edges) {
      return [];
    }

    return variantsData.productVariants.edges.map((edge: any) => {
      const variant = edge.node;
      const product = variant.product;
      const price = variant.pricing?.price?.gross?.amount || 0;
      const oldPrice = variant.pricing?.priceUndiscounted?.gross?.amount;

      let discount: number | undefined;
      if (oldPrice && oldPrice > price) {
        discount = Math.round(((oldPrice - price) / oldPrice) * 100);
      }

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        thumbnail: product.thumbnail?.url,
        price,
        oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
        discount,
        variantId: variant.id
      };
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

// Добавить товар в избранное
export async function addToFavorites(productId: string): Promise<boolean> {
  try {
    const favoriteIds = getLocalFavoriteIds();
    if (!favoriteIds.includes(productId)) {
      const newIds = [...favoriteIds, productId];
      await saveFavoriteIds(newIds);
    }
    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
}

// Удалить товар из избранного
export async function removeFromFavorites(productId: string): Promise<boolean> {
  try {
    const favoriteIds = getLocalFavoriteIds();
    const newIds = favoriteIds.filter(id => id !== productId);
    await saveFavoriteIds(newIds);
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
}

// Проверить, находится ли товар в избранном
export async function isFavorite(productId: string): Promise<boolean> {
  const favoriteIds = getLocalFavoriteIds();
  return favoriteIds.includes(productId);
}

// Очистить все избранное
export async function clearAllFavorites(): Promise<boolean> {
  try {
    await saveFavoriteIds([]);
    return true;
  } catch (error) {
    console.error('Error clearing favorites:', error);
    return false;
  }
}

