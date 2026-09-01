import { apiFetch, uploadsUrl } from '@/api/apiClient';
import { normalizeMediaUrl } from '@/utils/mediaUrl';
import {
  getProductReviews,
  type ProductReviewsListResponse,
} from '@/graphql/queries/reviews.service';

export interface PublishedReview {
  id: string;
  text: string;
  rating: number;
  createdAt: string;
  authorName?: string | null;
  image1?: string | null;
  image2?: string | null;
  product: {
    name: string;
    slug?: string;
    thumbnail?: string | null;
  };
}

export type PublishedReviewsPage = {
  items: PublishedReview[];
  total: number;
  page: number;
  limit: number;
};

type LatestApiRow = {
  id: string;
  text: string;
  rating: number;
  createdAt: string;
  authorName?: string | null;
  image1Url?: string | null;
  image2Url?: string | null;
  product?: { name: string; slug?: string; imageUrl?: string | null };
};

type LatestApiPage = {
  items: LatestApiRow[];
  total: number;
  page: number;
  limit: number;
};

type CacheEntry<T> = { at: number; data: T };

const TTL_MS = 60_000;
const latestPageCache = new Map<string, CacheEntry<PublishedReviewsPage>>();
const productPageCache = new Map<string, CacheEntry<PublishedReviewsPage>>();
const productMetaCache = new Map<
  string,
  CacheEntry<{ ratingAvg: number | null; ratingCount: number }>
>();

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    map.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, data: T) {
  map.set(key, { at: Date.now(), data });
}

function mapRow(r: LatestApiRow): PublishedReview {
  return {
    id: r.id,
    text: r.text,
    rating: r.rating,
    createdAt: r.createdAt,
    authorName: r.authorName?.trim() || null,
    image1: normalizeMediaUrl(uploadsUrl(r.image1Url) || r.image1Url),
    image2: normalizeMediaUrl(uploadsUrl(r.image2Url) || r.image2Url),
    product: {
      name: r.product?.name || '',
      slug: r.product?.slug,
      thumbnail: normalizeMediaUrl(uploadsUrl(r.product?.imageUrl) || r.product?.imageUrl),
    },
  };
}

function mapProductPage(res: ProductReviewsListResponse): PublishedReviewsPage {
  const productName = res.product?.name || '';
  const productSlug = res.product?.slug;
  const productThumb = normalizeMediaUrl(
    uploadsUrl(res.product?.imageUrl) || res.product?.imageUrl,
  );
  return {
    items: (res.items ?? []).map((r) => {
      const image1 = r.image1Url ?? r.image1 ?? null;
      const image2 = r.image2Url ?? r.image2 ?? null;
      return {
        id: r.id,
        text: r.text,
        rating: r.rating,
        createdAt: r.createdAt || '',
        authorName: r.authorName?.trim() || null,
        image1: normalizeMediaUrl(uploadsUrl(image1) || image1),
        image2: normalizeMediaUrl(uploadsUrl(image2) || image2),
        product: {
          name: productName,
          slug: productSlug,
          thumbnail: productThumb,
        },
      };
    }),
    total: res.total ?? 0,
    page: res.page ?? 1,
    limit: res.limit ?? 20,
  };
}

/** Каталог /reviews и главная: пагинированный latest (TTL cache). */
export async function getPublishedReviewsPage(
  page = 1,
  limit = 20,
): Promise<PublishedReviewsPage> {
  const key = `${page}:${limit}`;
  const cached = cacheGet(latestPageCache, key);
  if (cached) return cached;

  try {
    const data = await apiFetch<LatestApiPage>('/reviews/latest', {
      query: { page, limit },
    });
    const mapped: PublishedReviewsPage = {
      items: (data.items ?? []).map(mapRow),
      total: data.total ?? 0,
      page: data.page ?? page,
      limit: data.limit ?? limit,
    };
    cacheSet(latestPageCache, key, mapped);
    return mapped;
  } catch {
    return { items: [], total: 0, page, limit };
  }
}

/**
 * Превью на главной: берёт page=1 limit=20 из кэша (общий с /reviews) и режет.
 */
export async function getLatestPublishedReviews(limit = 12): Promise<PublishedReview[]> {
  const page = await getPublishedReviewsPage(1, Math.max(limit, 20));
  return page.items.slice(0, limit);
}

/** Отзывы конкретного товара: `/reviews/product/:slug` (+ meta cache для PDP). */
export async function getProductPublishedReviews(
  slug: string,
  page = 1,
  limit = 20,
): Promise<PublishedReviewsPage> {
  const key = `${slug}:${page}:${limit}`;
  const cached = cacheGet(productPageCache, key);
  if (cached) return cached;

  try {
    const res = await getProductReviews(slug, page, limit);
    const mapped = mapProductPage(res);
    cacheSet(productPageCache, key, mapped);
    cacheSet(productMetaCache, slug, {
      ratingAvg: res.ratingAvg,
      ratingCount: res.ratingCount ?? res.total ?? 0,
    });
    return mapped;
  } catch {
    return { items: [], total: 0, page, limit };
  }
}

/** Рейтинг для PDP — из meta-кэша или лёгкого product request. */
export async function getProductReviewsMeta(slug: string): Promise<{
  ratingAvg: number | null;
  ratingCount: number;
}> {
  const cached = cacheGet(productMetaCache, slug);
  if (cached) return cached;

  const page = await getProductPublishedReviews(slug, 1, 1);
  const meta = cacheGet(productMetaCache, slug);
  if (meta) return meta;

  return { ratingAvg: null, ratingCount: page.total };
}

/** @deprecated */
export async function getAllPublishedReviews(): Promise<PublishedReview[]> {
  return getLatestPublishedReviews(50);
}
