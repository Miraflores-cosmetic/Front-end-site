/**
 * REST-клиент отзывов (Nest `/api/v1/reviews`).
 * Раньше жил в `graphql/queries/` — Saleor GraphQL для отзывов не используется.
 */
import { apiFetch, apiJson, ApiError, uploadsUrl } from '@/api/apiClient';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

export interface ProductReviewCreateInput {
  product: string;
  order?: string;
  rating: number;
  text: string;
  image1?: File | null;
  image2?: File | null;
}

export type CreateProductReviewResult = {
  id: string;
  rating: number;
  text: string;
  imagesAttached: boolean;
  imagesError?: string;
};

export type ProductReviewsListResponse = {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl?: string | null;
    shortDescription?: string | null;
  } | null;
  ratingAvg: number | null;
  ratingCount: number;
  items: Array<{
    id: string;
    rating: number;
    text: string;
    createdAt?: string;
    authorName?: string | null;
    image1?: string | null;
    image2?: string | null;
    image1Url?: string | null;
    image2Url?: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
};

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
    shortDescription?: string | null;
  };
}

export type PublishedReviewsPage = {
  items: PublishedReview[];
  total: number;
  page: number;
  limit: number;
  product?: {
    name: string;
    slug?: string;
  } | null;
};

type LatestApiRow = {
  id: string;
  text: string;
  rating: number;
  createdAt: string;
  authorName?: string | null;
  image1Url?: string | null;
  image2Url?: string | null;
  product?: {
    name: string;
    slug?: string;
    imageUrl?: string | null;
    shortDescription?: string | null;
  };
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
      shortDescription: r.product?.shortDescription?.trim() || null,
    },
  };
}

function mapProductPage(res: ProductReviewsListResponse): PublishedReviewsPage {
  const productName = res.product?.name || '';
  const productSlug = res.product?.slug;
  const productThumb = normalizeMediaUrl(
    uploadsUrl(res.product?.imageUrl) || res.product?.imageUrl,
  );
  const productSub = res.product?.shortDescription?.trim() || null;
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
          shortDescription: productSub,
        },
      };
    }),
    total: res.total ?? 0,
    page: res.page ?? 1,
    limit: res.limit ?? 20,
    product: res.product
      ? { name: res.product.name, slug: res.product.slug }
      : productName
        ? { name: productName, slug: productSlug }
        : null,
  };
}

export async function createProductReview(
  input: ProductReviewCreateInput,
): Promise<CreateProductReviewResult> {
  const files = [input.image1, input.image2].filter(Boolean) as File[];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      throw new ApiError('Размер фото — максимум 5 МБ', 400);
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      throw new ApiError('Фото: только JPEG, PNG, WebP или GIF', 400);
    }
  }

  const created = await apiJson<{ id: string; rating: number; text: string }>('/reviews', 'POST', {
    productId: input.product,
    orderId: input.order,
    rating: input.rating,
    text: input.text,
  });

  const hasImages = Boolean(input.image1 || input.image2);
  if (!hasImages) {
    return { ...created, imagesAttached: false };
  }

  const fd = new FormData();
  if (input.image1) fd.append('files', input.image1);
  if (input.image2) fd.append('files', input.image2);

  try {
    await apiFetch(`/reviews/${encodeURIComponent(created.id)}/images`, {
      method: 'POST',
      body: fd,
    });
    return { ...created, imagesAttached: true };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    const message =
      e instanceof ApiError ? e.message : 'Не удалось загрузить фото';
    return {
      ...created,
      imagesAttached: false,
      imagesError: message,
    };
  }
}

/** Id товаров, по которым пользователь уже оставлял отзыв. */
export async function getMyReviewedProductIds(): Promise<string[]> {
  const data = await apiFetch<{ productIds: string[] }>('/reviews/mine/product-ids');
  return Array.isArray(data.productIds) ? data.productIds : [];
}

export async function getProductReviews(
  slug: string,
  page = 1,
  limit = 20,
): Promise<ProductReviewsListResponse> {
  return apiFetch(`/reviews/product/${encodeURIComponent(slug)}`, {
    query: { page, limit },
  });
}

/** Каталог /reviews и главная: пагинированный latest (TTL cache). Ошибки пробрасываются. */
export async function getPublishedReviewsPage(
  page = 1,
  limit = 20,
): Promise<PublishedReviewsPage> {
  const key = `${page}:${limit}`;
  const cached = cacheGet(latestPageCache, key);
  if (cached) return cached;

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
}

export async function getLatestPublishedReviews(limit = 12): Promise<PublishedReview[]> {
  const page = await getPublishedReviewsPage(1, Math.max(limit, 20));
  return page.items.slice(0, limit);
}

export async function getProductPublishedReviews(
  slug: string,
  page = 1,
  limit = 20,
): Promise<PublishedReviewsPage> {
  const key = `${slug}:${page}:${limit}`;
  const cached = cacheGet(productPageCache, key);
  if (cached) return cached;

  const res = await getProductReviews(slug, page, limit);
  const mapped = mapProductPage(res);
  cacheSet(productPageCache, key, mapped);
  cacheSet(productMetaCache, slug, {
    ratingAvg: res.ratingAvg,
    ratingCount: res.ratingCount ?? res.total ?? 0,
  });
  return mapped;
}

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
