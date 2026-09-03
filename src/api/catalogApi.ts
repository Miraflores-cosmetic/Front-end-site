/**
 * Каталог Админ панели 2.0 — запросы + адаптеры под Saleor-типы Front.
 */
import { apiFetch, apiJson, uploadsUrl } from '@/api/apiClient';
import type { Connection, ProductDetailNode, ProductNode, WarehouseNode } from '@/graphql/types/core.types';
import type { ProductEdge } from '@/types/products';

// ——— Jcos raw types ———

export type JcosProductCard = {
  id: string;
  variantId: string | null;
  variantName: string | null;
  shadeId: string | null;
  shadeName: string | null;
  slug: string;
  name: string;
  shortDescription: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  priceFrom: boolean;
  available: number;
  minQty: number;
  maxQty: number;
  imageUrl: string | null;
  imageUrls: string[];
  mediaType: 'image' | 'video';
};

type JcosVariantImage = {
  id: string;
  url: string;
  mediaType: 'image' | 'video';
  sortOrder: number;
};

type JcosVariant = {
  id: string;
  name: string;
  slug: string;
  volumeMl: number | null;
  sku: string | null;
  price: number;
  compareAt: number | null;
  orderMinQty: number;
  orderMaxQty: number | null;
  stock: number;
  stockReserve: number;
  available: number;
  images: JcosVariantImage[];
};

export type JcosProductDetail = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  descriptionHtml: string | null;
  pageShortDescriptionHtml: string | null;
  actionEffectHtml: string | null;
  applicationHtml: string | null;
  compositionHtml: string | null;
  importantNoteHtml: string | null;
  mirafloresNoteHtml: string | null;
  storageHtml: string | null;
  productType: string | null;
  purpose: string | null;
  shelfLife: string | null;
  extraHtml: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: {
      id: string;
      name: string;
      slug: string;
      parent?: { id: string; name: string; slug: string } | null;
    } | null;
  } | null;
  catalogTags?: Array<{ id: string; name: string; slug: string; sortOrder: number }>;
  images: JcosVariantImage[];
  variants: JcosVariant[];
  minPrice: number | null;
  maxPrice: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  canonicalPath: string | null;
  seoNoIndex: boolean;
};

type JcosCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  children?: JcosCategory[];
};

type JcosCollection = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
};

export type CatalogCollectionPublic = JcosCollection;

/** Публичная коллекция «Бестселлеры» (чип каталога + «смотреть все»). */
export const BESTSELLERS_COLLECTION_SLUG = 'bestsellery';

/** Служебные коллекции — не в чипе витрины. */
const HIDDEN_COLLECTION_SLUGS = new Set(['tovar-v-meniu']);

export function isStorefrontCollection(c: { slug: string }): boolean {
  return !HIDDEN_COLLECTION_SLUGS.has(c.slug);
}

export type CartSyncLine = { variantId: string; qty: number };

export type CartSyncResponse = {
  items: Array<{
    key: string;
    productId: string;
    variantId: string;
    shadeId: string | null;
    shadeName: string | null;
    slug: string;
    name: string;
    variantName: string;
    imageUrl: string | null;
    price: number;
    listPrice: number;
    minQty: number;
    maxQty: number;
    qty: number;
  }>;
  removedKeys: string[];
  removedLines?: Array<{ key: string; reason: 'oos' | 'missing'; name?: string }>;
  listSubtotal: number;
  subtotal: number;
  campaignDiscountTotal: number;
};

const SALEOR_COLLECTION_HINTS: Record<string, string[]> = {
  'Q29sbGVjdGlvbjo3': ['bestsellery', 'bestseller', 'bestsellers', 'хит', 'hit'],
  'Q29sbGVjdGlvbjoxMQ==': ['nabory', 'nabor', 'sets', 'набор'],
  'Q29sbGVjdGlvbjoxMg==': ['menu', 'меню'],
};

let collectionsCache: { items: JcosCollection[] } | null = null;
let collectionsInflight: Promise<{ items: JcosCollection[] }> | null = null;
let categoriesCache: { items: JcosCategory[] } | null = null;
let categoriesInflight: Promise<{ items: JcosCategory[] }> | null = null;

function pricingBlock(price: number, compareAt: number | null) {
  const discount =
    compareAt != null && compareAt > price
      ? { gross: { amount: compareAt - price, currency: 'RUB' as const } }
      : { gross: { amount: 0, currency: 'RUB' as const } };
  return {
    price: { gross: { amount: price, currency: 'RUB' as const } },
    priceUndiscounted:
      compareAt != null && compareAt > price
        ? { gross: { amount: compareAt, currency: 'RUB' as const } }
        : undefined,
    discount,
  };
}

function mapVariantNode(v: JcosVariant) {
  return {
    node: {
      id: v.id,
      sku: v.sku || '',
      name: v.name,
      quantityLimitPerCustomer: v.orderMaxQty,
      trackInventory: true,
      quantityAvailable: v.available,
      attributes: v.volumeMl
        ? [
            {
              attribute: { id: 'volume', name: 'Объём', slug: 'obem' },
              values: [{ name: `${v.volumeMl} мл`, slug: String(v.volumeMl), plainText: `${v.volumeMl} мл` }],
            },
          ]
        : [],
      media: v.images.map((img) => ({
        id: img.id,
        url: uploadsUrl(img.url) || img.url,
        alt: v.name,
        sortOrder: img.sortOrder,
        mediaType: img.mediaType === 'video' ? 'video' : 'image',
      })),
      pricing: pricingBlock(v.price, v.compareAt),
    },
  };
}

export function cardToProductEdge(card: JcosProductCard): ProductEdge {
  const thumb = uploadsUrl(card.imageUrl) || card.imageUrl || '';
  const urls = (card.imageUrls ?? []).map((u) => uploadsUrl(u) || u).filter(Boolean);
  const variantId = card.variantId || card.id;
  const shortDescription = card.shortDescription?.trim() || '';
  return {
    node: {
      id: card.id,
      name: card.name,
      slug: card.slug,
      shortDescription,
      description: shortDescription,
      thumbnail: { url: thumb, alt: card.name },
      media: urls.map((url) => ({ url, alt: card.name })),
      category: { id: '', name: '' },
      collections: [],
      attributes: shortDescription
        ? [
            {
              attribute: {
                id: 'card-desc',
                name: 'Описание в карточке товара',
                slug: 'opisanie-v-kartochke-tovara',
              },
              values: [{ name: shortDescription, plainText: shortDescription }],
            },
          ]
        : [],
      defaultVariant: {
        id: variantId,
        sku: '',
        name: card.variantName || '',
        quantityLimitPerCustomer: card.maxQty > 0 ? card.maxQty : null,
        trackInventory: true,
        quantityAvailable: card.available,
        pricing: pricingBlock(card.price, card.oldPrice),
      },
      productVariants: [mapVariantNode({
        id: variantId,
        name: card.variantName || card.name,
        slug: card.slug,
        volumeMl: null,
        sku: '',
        price: card.price,
        compareAt: card.oldPrice,
        orderMinQty: card.minQty,
        orderMaxQty: card.maxQty > 0 ? card.maxQty : null,
        stock: card.available,
        stockReserve: 0,
        available: card.available,
        images: urls.map((url, i) => ({
          id: `img-${i}`,
          url,
          mediaType: 'image' as const,
          sortOrder: i,
        })),
      })],
    } as unknown as ProductEdge['node'],
  };
}

export function adaptProductDetail(p: JcosProductDetail): ProductDetailNode {
  const media = p.images.map((img) => ({
    id: img.id,
    url: uploadsUrl(img.url) || img.url,
    alt: p.name,
    sortOrder: img.sortOrder,
    mediaType: img.mediaType === 'video' ? 'video' : 'image',
  }));
  const thumbUrl = media[0]?.url || '';
  const edges = p.variants.map(mapVariantNode);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    isPublished: true,
    description: p.descriptionHtml || p.shortDescription || '',
    pageShortDescriptionHtml: p.pageShortDescriptionHtml || '',
    actionEffectHtml: p.actionEffectHtml || '',
    applicationHtml: p.applicationHtml || '',
    compositionHtml: p.compositionHtml || '',
    importantNoteHtml: p.importantNoteHtml || '',
    mirafloresNoteHtml: p.mirafloresNoteHtml || '',
    storageHtml: p.storageHtml || '',
    purpose: p.purpose || '',
    shelfLife: p.shelfLife || '',
    catalogTags: p.catalogTags ?? [],
    productType: { name: p.productType || '' },
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
          parent: p.category.parent
            ? {
                id: p.category.parent.id,
                name: p.category.parent.name,
                slug: p.category.parent.slug,
                parent: p.category.parent.parent
                  ? {
                      id: p.category.parent.parent.id,
                      name: p.category.parent.parent.name,
                      slug: p.category.parent.parent.slug,
                    }
                  : null,
              }
            : null,
        }
      : { id: '', name: '', slug: '' },
    attributes: [],
    media,
    thumbnail: { url: thumbUrl, alt: p.name },
    productVariants: { edges: edges as unknown as ProductDetailNode['productVariants']['edges'] },
    pricing: {
      priceRange: {
        start: { net: { amount: p.minPrice ?? 0, currency: 'RUB' } },
        stop: { net: { amount: p.maxPrice ?? 0, currency: 'RUB' } },
      },
    },
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    ogImageUrl: p.ogImageUrl ? uploadsUrl(p.ogImageUrl) || p.ogImageUrl : null,
    canonicalPath: p.canonicalPath,
    seoNoIndex: p.seoNoIndex,
  } as ProductDetailNode;
}

// ——— API ———

export async function fetchProductList(params: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  collection?: string;
  sort?: string;
  priceMin?: number;
  priceMax?: number;
  sale?: boolean;
  /** Batch hydrate — comma-joined on the wire. */
  slugs?: string[];
}): Promise<{ items: JcosProductCard[]; total: number; page: number; limit: number }> {
  return apiFetch('/catalog/products', {
    query: {
      page: params.page,
      limit: params.limit,
      category: params.category,
      tag: params.tag,
      collection: params.collection,
      sort: params.sort,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      sale: params.sale ? '1' : undefined,
      slugs: params.slugs?.length ? params.slugs.join(',') : undefined,
    },
  });
}

export async function fetchProductBySlug(slug: string): Promise<JcosProductDetail | null> {
  try {
    return await apiFetch<JcosProductDetail>(`/catalog/products/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function fetchCategories(): Promise<{ items: JcosCategory[] }> {
  if (categoriesCache) return categoriesCache;
  if (!categoriesInflight) {
    categoriesInflight = apiFetch<{ items: JcosCategory[] }>('/catalog/categories')
      .then((res) => {
        categoriesCache = { items: res.items ?? [] };
        return categoriesCache;
      })
      .finally(() => {
        categoriesInflight = null;
      });
  }
  return categoriesInflight;
}

/** Meta only (slug/name/cover). Backend default без products — чипы каталога. */
export async function fetchCollections(): Promise<{ items: JcosCollection[] }> {
  if (collectionsCache) return collectionsCache;
  if (!collectionsInflight) {
    collectionsInflight = apiFetch<{ items: JcosCollection[] }>('/catalog/collections')
      .then((res) => {
        collectionsCache = { items: res.items ?? [] };
        return collectionsCache;
      })
      .finally(() => {
        collectionsInflight = null;
      });
  }
  return collectionsInflight;
}

export type CatalogTagPublic = {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  sortOrder?: number;
  /** Заголовок из доп. инфо (CatalogTagStep) */
  title?: string | null;
  /** Описание из доп. инфо */
  description?: string | null;
};

/** In-flight / memory cache — Header + Steps + Catalog не дублируют GET /catalog/tags. */
let catalogTagsCache: { items: CatalogTagPublic[] } | null = null;
let catalogTagsInflight: Promise<{ items: CatalogTagPublic[] }> | null = null;

export async function fetchCatalogTags(): Promise<{ items: CatalogTagPublic[] }> {
  if (catalogTagsCache) return catalogTagsCache;
  if (!catalogTagsInflight) {
    catalogTagsInflight = apiFetch<{ items: CatalogTagPublic[] }>('/catalog/tags')
      .then((res) => {
        catalogTagsCache = { items: res.items ?? [] };
        return catalogTagsCache;
      })
      .finally(() => {
        catalogTagsInflight = null;
      });
  }
  return catalogTagsInflight;
}

/** Invalidate tags/categories/collections memory caches (Retry / admin hook). */
export function clearCatalogApiCaches() {
  catalogTagsCache = null;
  catalogTagsInflight = null;
  categoriesCache = null;
  categoriesInflight = null;
  collectionsCache = null;
  collectionsInflight = null;
}

export async function syncCart(lines: CartSyncLine[]): Promise<CartSyncResponse> {
  return apiJson('/catalog/cart/sync', 'POST', { lines });
}

export async function resolveCollectionSlug(saleorGid: string): Promise<string | null> {
  const { items } = await fetchCollections();
  const patterns = SALEOR_COLLECTION_HINTS[saleorGid] ?? [];
  for (const c of items) {
    const slugL = c.slug.toLowerCase();
    const nameL = c.name.toLowerCase();
    if (patterns.some((p) => slugL.includes(p) || nameL.includes(p))) return c.slug;
  }
  return items[0]?.slug ?? null;
}

export async function getProductsByCollectionGid(
  gid: string,
  limit = 50,
): Promise<{ edges: ProductEdge[] }> {
  const slug = await resolveCollectionSlug(gid);
  if (!slug) return { edges: [] };
  const res = await fetchProductList({ collection: slug, limit, page: 1 });
  return { edges: (res.items ?? []).map(cardToProductEdge) };
}

export async function getProductEdges(params: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  collection?: string;
  sort?: string;
  priceMin?: number;
  priceMax?: number;
  sale?: boolean;
}): Promise<{ edges: ProductEdge[]; total: number }> {
  const res = await fetchProductList(params);
  return {
    edges: (res.items ?? []).map(cardToProductEdge),
    total: res.total ?? 0,
  };
}

export async function getAllProductEdges(maxLimit = 200): Promise<{ edges: ProductEdge[] }> {
  const pageSize = 100;
  const all: ProductEdge[] = [];
  let page = 1;
  while (all.length < maxLimit) {
    const res = await fetchProductList({ page, limit: pageSize });
    const batch = (res.items ?? []).map(cardToProductEdge);
    all.push(...batch);
    if (batch.length < pageSize || all.length >= (res.total ?? 0)) break;
    page += 1;
  }
  return { edges: all.slice(0, maxLimit) };
}

export async function getFilteredProducts(
  first = 20,
  _isPublished?: boolean,
): Promise<Connection<ProductNode>> {
  const res = await fetchProductList({ limit: first, page: 1 });
  const edges = (res.items ?? []).map((c) => ({
    node: {
      id: c.id,
      name: c.name,
      slug: c.slug,
      isPublished: true,
      thumbnail: { url: uploadsUrl(c.imageUrl) || '', alt: c.name },
      media: (c.imageUrls ?? []).map((u) => ({ id: u, alt: c.name, url: uploadsUrl(u) || u })),
    } as ProductNode,
  }));
  return {
    edges,
    pageInfo: { hasNextPage: res.total > first, hasPreviousPage: false, endCursor: null },
  };
}

export async function getProductsForContextSearch(first = 200) {
  const res = await getAllProductEdges(first);
  return res.edges.map((e) => ({
    id: e.node.id,
    name: e.node.name,
    slug: e.node.slug,
    description: e.node.description ?? null,
    attributes: [],
  }));
}

export async function getWarehouses(): Promise<WarehouseNode[]> {
  return [];
}
