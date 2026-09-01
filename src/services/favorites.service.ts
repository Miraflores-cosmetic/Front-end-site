import { apiJson, uploadsUrl } from '@/api/apiClient';
import {
  addFavorite as apiAddFavorite,
  fetchFavoriteIds,
  fetchFavoriteItems,
  replaceFavorites,
  removeFavorite as apiRemoveFavorite,
} from '@/api/accountApi';

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

const GUEST_STORAGE_KEY = 'favorites_guest';
const getUserId = () => localStorage.getItem('userId') || 'guest';
const getStorageKey = (userId?: string) => `favorites_${userId ?? getUserId()}`;

/** In-memory cache — один hydrate на сессию вместо N isFavorite. */
let cachedIds: Set<string> | null = null;
let hydratePromise: Promise<void> | null = null;
const idListeners = new Set<() => void>();

function notifyFavoriteIds() {
  idListeners.forEach((cb) => cb());
}

export function subscribeFavoriteIds(cb: () => void): () => void {
  idListeners.add(cb);
  return () => {
    idListeners.delete(cb);
  };
}

export function isFavoriteSync(variantId: string): boolean {
  if (!variantId) return false;
  if (cachedIds) return cachedIds.has(variantId);
  return getLocalFavoriteIds().includes(variantId);
}

function setCachedIds(ids: string[]) {
  cachedIds = new Set(ids);
  notifyFavoriteIds();
}

/** Один fetchFavoriteIds (+ local merge) на auth-сессию. */
export async function hydrateFavoriteIds(force = false): Promise<void> {
  if (!force && cachedIds) return;
  if (!force && hydratePromise) {
    await hydratePromise;
    return;
  }

  hydratePromise = (async () => {
    let ids = getLocalFavoriteIds();
    const token = localStorage.getItem('token');
    const userId = getUserId();
    if (userId !== 'guest' && token) {
      try {
        const serverIds = await fetchFavoriteIds();
        ids = Array.from(new Set([...serverIds, ...ids]));
        localStorage.setItem(getStorageKey(userId), JSON.stringify(ids));
        if (ids.some((id) => !serverIds.includes(id))) {
          try {
            await replaceFavorites(ids);
          } catch {
            /* keep local */
          }
        }
      } catch {
        /* local only */
      }
    }
    setCachedIds(ids);
  })();

  try {
    await hydratePromise;
  } finally {
    hydratePromise = null;
  }
}

export function clearFavoriteIdsCache() {
  cachedIds = null;
  hydratePromise = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('favoritesUpdated', () => {
    void hydrateFavoriteIds(true);
  });
}

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
  if (token) await saveFavoriteIds(merged, userId);
}

const getLocalFavoriteIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(getUserId())) || '[]');
  } catch {
    return [];
  }
};

async function saveFavoriteIds(ids: string[], userIdOverride?: string) {
  const userId = userIdOverride ?? getUserId();
  localStorage.setItem(getStorageKey(userId), JSON.stringify(ids));
  setCachedIds(ids);
  if (userId !== 'guest' && localStorage.getItem('token')) {
    try {
      await replaceFavorites(ids);
    } catch (e) {
      console.warn('Failed to sync favorites:', e);
    }
  }
}

export async function getFavorites(): Promise<FavoriteProduct[]> {
  try {
    const userId = getUserId();
    let favoriteIds = getLocalFavoriteIds();
    const token = localStorage.getItem('token');

    if (userId !== 'guest' && token) {
      try {
        const serverIds = await fetchFavoriteIds();
        const merged = Array.from(new Set([...serverIds, ...favoriteIds]));
        favoriteIds = merged;
        localStorage.setItem(getStorageKey(userId), JSON.stringify(favoriteIds));
        setCachedIds(favoriteIds);
        if (merged.some((id) => !serverIds.includes(id))) {
          await saveFavoriteIds(merged, userId);
        }
      } catch {
        /* local only */
      }
    }

    if (!favoriteIds.length) return [];

    if (token && userId !== 'guest') {
      try {
        const items = await fetchFavoriteItems();
        return items
          .filter((item) => favoriteIds.includes(item.variantId))
          .map((item) => {
            const price = item.price;
            const oldPrice = item.listPrice && item.listPrice > price ? item.listPrice : undefined;
            const thumb = item.imageUrl || '';
            const gallery =
              item.imageUrls.length > 0 ? item.imageUrls : thumb ? [thumb] : [];
            return {
              id: item.variantId,
              productId: item.productId,
              title: item.name,
              name: item.name,
              slug: item.slug,
              description: item.shortDescription || '',
              size: item.variantName || '',
              thumbnail: thumb,
              images: gallery,
              price,
              oldPrice,
              discount:
                item.discountPercent ??
                (oldPrice && oldPrice > price
                  ? Math.round(((oldPrice - price) / oldPrice) * 100)
                  : undefined),
              variantId: item.variantId,
              productVariants: [],
              collections: { id: '', name: '', slug: '' },
              attributes: [],
            };
          });
      } catch {
        /* fallback below */
      }
    }

    return [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export async function addToFavorites(variantId: string): Promise<boolean> {
  try {
    const ids = getLocalFavoriteIds();
    if (!ids.includes(variantId)) {
      await saveFavoriteIds([...ids, variantId]);
      if (localStorage.getItem('token')) await apiAddFavorite(variantId);
    }
    return true;
  } catch {
    return false;
  }
}

export async function removeFromFavorites(variantId: string): Promise<boolean> {
  try {
    const ids = getLocalFavoriteIds().filter((id) => id !== variantId);
    await saveFavoriteIds(ids);
    if (localStorage.getItem('token')) await apiRemoveFavorite(variantId);
    return true;
  } catch {
    return false;
  }
}

export async function isFavorite(variantId: string): Promise<boolean> {
  await hydrateFavoriteIds();
  return isFavoriteSync(variantId);
}

export async function clearAllFavorites(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (token && userId && userId !== 'guest') {
      await apiJson('/account/favorites', 'DELETE');
    }
    await saveFavoriteIds([]);
    return true;
  } catch {
    return false;
  }
}
