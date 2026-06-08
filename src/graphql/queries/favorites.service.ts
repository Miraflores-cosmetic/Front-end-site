import { graphqlRequest } from '@/graphql/client';

export interface FavoriteProduct {
  id: string;
  productId: string;
  name: string;
  title: string;
  slug: string;
  description: string;
  size: string;
  thumbnail: string;
  images: string[];
  price: number;
  oldPrice?: number;
  discount?: number;
  variantId: string;
  productVariants: any[];
  collections: any;
  attributes: any[];
}

function getVolumeFromVariant(variant: {
  name?: string;
  attributes?: Array<{
    attribute?: { slug?: string; name?: string };
    values?: Array<{ name?: string; plainText?: string }>;
  }>;
}): string {
  let variantName = variant?.name || '';
  if (variant?.attributes?.length) {
    const volumeAttr = variant.attributes.find(
      attr =>
        attr.attribute?.slug === 'obem' ||
        attr.attribute?.slug === 'volume' ||
        attr.attribute?.name?.toLowerCase().includes('объем') ||
        attr.attribute?.name?.toLowerCase().includes('volume'),
    );
    if (volumeAttr?.values?.[0]?.name) variantName = volumeAttr.values[0].name;
    else if (volumeAttr?.values?.[0]?.plainText) variantName = volumeAttr.values[0].plainText;
  }
  return variantName;
}


const GUEST_STORAGE_KEY = 'favorites_guest';

const getUserId = () => localStorage.getItem('userId') || 'guest';
const getStorageKey = (userId?: string) => `favorites_${userId ?? getUserId()}`;

/** Перенос избранного гостя в аккаунт после входа / getMe */
export async function migrateGuestFavoritesToUser(userId: string): Promise<void> {
  if (!userId || typeof window === 'undefined') return;

  let guestIds: string[] = [];
  try {
    guestIds = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]');
  } catch {
    guestIds = [];
  }
  if (!guestIds.length) return;

  let userIds: string[] = [];
  try {
    userIds = JSON.parse(localStorage.getItem(getStorageKey(userId)) || '[]');
  } catch {
    userIds = [];
  }

  const merged = Array.from(new Set([...userIds, ...guestIds]));
  localStorage.setItem(getStorageKey(userId), JSON.stringify(merged));
  localStorage.removeItem(GUEST_STORAGE_KEY);

  const token = localStorage.getItem('token');
  if (token) {
    await saveFavoriteIds(merged, userId);
  }
}

const getLocalFavoriteIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  const key = getStorageKey(getUserId());
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

async function saveFavoriteIds(ids: string[], userIdOverride?: string) {
  const userId = userIdOverride ?? getUserId();
  // 1. Save to LocalStorage
  const key = getStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(ids));

  // 2. Sync with Server REST API
  if (userId !== 'guest') {
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

function getFavoritesApiEndpoint(): string {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return '/api/favorites';
  }
  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || '';
  return graphqlUrl.replace('/graphql/', '/api/favorites/');
}

async function fetchServerFavoriteIds(token: string): Promise<string[] | null> {
  try {
    const res = await fetch(getFavoritesApiEndpoint(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const serverIds = json.favorites;
    return Array.isArray(serverIds) ? serverIds : null;
  } catch (e) {
    console.warn('Failed to fetch favorites from REST API', e);
    return null;
  }
}

// Получить избранные товары
export async function getFavorites(): Promise<FavoriteProduct[]> {
  try {
    const userId = getUserId();
    let favoriteIds = getLocalFavoriteIds();
    const token = localStorage.getItem('token');

    // Sync with REST API if user is logged in
    if (userId !== 'guest' && token) {
      const serverIds = await fetchServerFavoriteIds(token);

      if (serverIds) {
        const merged = Array.from(new Set([...serverIds, ...favoriteIds]));
        favoriteIds = merged;
        localStorage.setItem(getStorageKey(userId), JSON.stringify(favoriteIds));

        const serverMissing = merged.some(id => !serverIds.includes(id));
        if (serverMissing) {
          await saveFavoriteIds(merged, userId);
        }
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
              attributes {
                attribute {
                  id
                  name
                  slug
                }
                values {
                  name
                  slug
                  plainText
                }
              }
              pricing {
                price { gross { amount } }
                priceUndiscounted { gross { amount } }
                discount { gross { amount } }
              }
              product {
                id
                name
                slug
                description
                thumbnail { url }
                media { url, alt }
                category { id, name }
                collections { id, name, slug }
                productVariants(first: 10) {
                  edges {
                    node {
                      id
                      name
                      sku
                      attributes {
                        attribute { id, name, slug }
                        values { name, slug, plainText }
                      }
                      pricing {
                        price { gross { amount } }
                        priceUndiscounted { gross { amount } }
                        discount { net { amount, currency } }
                      }
                    }
                  }
                }
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
        id: variant.id, // Используем ID варианта как основной ID для карточки
        productId: product.id,
        title: product.name,
        name: product.name,
        slug: product.slug,
        description: JSON.parse(product.description || '{}')?.blocks?.[0]?.data?.text || '',
        size: getVolumeFromVariant(variant),
        thumbnail: product.thumbnail?.url || '',
        images: product.media?.map((m: any) => m.url) || [],
        price,
        oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
        discount,
        variantId: variant.id,
        productVariants: product.productVariants?.edges || product.productVariants || [],
        collections: product.collections?.[0] || product.collections || null,
        attributes: variant.attributes || []
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

