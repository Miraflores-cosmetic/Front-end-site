import {
  cardToProductEdge,
  clearCatalogApiCaches,
  fetchCatalogTags,
  fetchCategories,
  fetchCollections,
  fetchProductList,
  getProductEdges,
  isStorefrontCollection,
  type CatalogCollectionPublic,
  type CatalogTagPublic,
} from '@/api/catalogApi';
import { searchCatalog } from '@/api/cmsApi';
import { uploadsUrl } from '@/api/apiClient';
import { mapProductNodeToBestSeller } from '@/utils/mapProductNodeToBestSeller';
import type { BestSellersProduct } from '@/types/products';
import {
  findCategoryInTree,
  findSubcategoryInRoot,
} from '@/lib/categoryCatalogHref';
import { CATALOG_PAGE_SIZE } from './catalogHref';

export type CatalogCategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  children: CatalogCategoryNode[];
};

export type CatalogNotice =
  | 'api'
  | 'unknown_cat'
  | 'unknown_sub'
  | 'unknown_tag'
  | 'unknown_collection'
  | null;

export type CatalogPageData = {
  categories: CatalogCategoryNode[];
  tags: CatalogTagPublic[];
  collections: CatalogCollectionPublic[];
  products: BestSellersProduct[];
  total: number;
  page: number;
  limit: number;
  cat: string;
  sub: string;
  tag: string;
  collection: string;
  collectionName: string | null;
  sale: boolean;
  priceMin: number | null;
  priceMax: number | null;
  q: string;
  title: string;
  notice: CatalogNotice;
};

type CatalogMeta = {
  categories: CatalogCategoryNode[];
  tags: CatalogTagPublic[];
  collections: CatalogCollectionPublic[];
};

/** Session cache — categories/tags/collections не перекачиваем на каждый filter/page. */
let metaCache: CatalogMeta | null = null;
let metaPromise: Promise<CatalogMeta> | null = null;

function mapCategories(
  items: Awaited<ReturnType<typeof fetchCategories>>['items'],
): CatalogCategoryNode[] {
  return (items ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    imageUrl: c.imageUrl ? uploadsUrl(c.imageUrl) || c.imageUrl : null,
    children: (c.children ?? []).map((ch) => ({
      id: ch.id,
      name: ch.name,
      slug: ch.slug,
      parentId: ch.parentId,
      imageUrl: ch.imageUrl ? uploadsUrl(ch.imageUrl) || ch.imageUrl : null,
      children: (ch.children ?? []).map((gr) => ({
        id: gr.id,
        name: gr.name,
        slug: gr.slug,
        parentId: gr.parentId,
        imageUrl: gr.imageUrl ? uploadsUrl(gr.imageUrl) || gr.imageUrl : null,
        children: [],
      })),
    })),
  }));
}

async function loadCatalogMeta(force = false): Promise<CatalogMeta> {
  if (force) clearCatalogApiCaches();
  if (!force && metaCache) return metaCache;
  if (!force && metaPromise) return metaPromise;

  metaPromise = (async () => {
    const [catsRes, tagsRes, colsRes] = await Promise.all([
      fetchCategories(),
      fetchCatalogTags(),
      fetchCollections(),
    ]);
    const next: CatalogMeta = {
      categories: mapCategories(catsRes.items ?? []),
      tags: tagsRes.items ?? [],
      collections: (colsRes.items ?? []).filter(isStorefrontCollection),
    };
    metaCache = next;
    return next;
  })();

  try {
    return await metaPromise;
  } finally {
    metaPromise = null;
  }
}

/** Invalidate after admin edits / Retry. */
export function clearCatalogMetaCache() {
  metaCache = null;
  metaPromise = null;
  searchHitsCache.clear();
  searchHitsInflight.clear();
  clearCatalogApiCaches();
}

type SearchProductHit = {
  id: string;
  title: string;
  href: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

/** Hits for one q — «Показать ещё» не повторяет GET /search. */
const searchHitsCache = new Map<string, SearchProductHit[]>();
const searchHitsInflight = new Map<string, Promise<SearchProductHit[]>>();

async function loadSearchProductHits(q: string): Promise<SearchProductHit[]> {
  const key = q.trim();
  const cached = searchHitsCache.get(key);
  if (cached) return cached;
  let inflight = searchHitsInflight.get(key);
  if (!inflight) {
    inflight = searchCatalog(key)
      .then((search) => {
        const hits =
          search.groups?.find((g) => g.key === 'products')?.items ?? [];
        searchHitsCache.set(key, hits);
        return hits;
      })
      .finally(() => {
        searchHitsInflight.delete(key);
      });
    searchHitsInflight.set(key, inflight);
  }
  return inflight;
}

function emptyPage(
  opts: {
    page: number;
    limit: number;
    cat: string;
    sub: string;
    tag: string;
    collection: string;
    sale: boolean;
    priceMin: number | null;
    priceMax: number | null;
    q: string;
  },
  partial: Partial<CatalogPageData> & { notice: CatalogNotice },
): CatalogPageData {
  return {
    categories: [],
    tags: [],
    collections: [],
    products: [],
    total: 0,
    collectionName: null,
    title: opts.q ? `Поиск: ${opts.q}` : 'Каталог',
    ...opts,
    ...partial,
  };
}

/**
 * Search hits → catalog cards.
 * One GET /catalog/products?slugs=… instead of N× GET /products/:slug.
 */
async function hydrateSearchHits(
  items: Array<{
    id: string;
    title: string;
    href: string;
    subtitle?: string | null;
    imageUrl?: string | null;
  }>,
): Promise<BestSellersProduct[]> {
  const slugs = items
    .map((item) => item.href.replace(/^\/product\//, '').split('?')[0]?.trim() || '')
    .filter(Boolean);
  if (!slugs.length) return [];

  const res = await fetchProductList({
    slugs,
    limit: slugs.length,
    page: 1,
  });
  const bySlug = new Map((res.items ?? []).map((c) => [c.slug, c]));
  const products: BestSellersProduct[] = [];
  for (const slug of slugs) {
    const card = bySlug.get(slug);
    if (!card) continue;
    products.push(mapProductNodeToBestSeller(cardToProductEdge(card).node));
  }
  return products;
}

export async function loadCatalogPage(opts: {
  cat?: string;
  sub?: string;
  tag?: string;
  collection?: string;
  sale?: boolean;
  priceMin?: number | null;
  priceMax?: number | null;
  page?: number;
  q?: string;
  limit?: number;
  /** Force refetch categories/tags/collections (Retry). */
  refreshMeta?: boolean;
}): Promise<CatalogPageData> {
  const cat = opts.cat?.trim() || '';
  const sub = opts.sub?.trim() || '';
  const tag = opts.tag?.trim() || '';
  const collection = opts.collection?.trim() || '';
  const sale = Boolean(opts.sale);
  const priceMin = opts.priceMin ?? null;
  const priceMax = opts.priceMax ?? null;
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim() || '';
  const limit = Math.max(1, opts.limit ?? CATALOG_PAGE_SIZE);

  const baseOpts = {
    page,
    limit,
    cat,
    sub,
    tag,
    collection,
    sale,
    priceMin,
    priceMax,
    q,
  };

  let categories: CatalogCategoryNode[] = [];
  let tags: CatalogTagPublic[] = [];
  let collections: CatalogCollectionPublic[] = [];
  let notice: CatalogNotice = null;
  let products: BestSellersProduct[] = [];
  let total = 0;
  let collectionName: string | null = null;

  try {
    const meta = await loadCatalogMeta(Boolean(opts.refreshMeta));
    categories = meta.categories;
    tags = meta.tags;
    collections = meta.collections;
  } catch {
    return emptyPage(baseOpts, { notice: 'api' });
  }

  let resolvedCat = cat;
  let resolvedSub = sub;
  let resolvedTag = tag;

  let selectedRoot = resolvedCat
    ? categories.find((c) => c.slug === resolvedCat) ?? null
    : null;

  // /catalog/:slug — slug может быть подкатегорией (в т.ч. 3-го уровня) или тегом
  if (resolvedCat && !selectedRoot && !resolvedSub) {
    const found = findCategoryInTree(categories, resolvedCat);
    if (found) {
      selectedRoot = found.root as CatalogCategoryNode;
      if (found.leaf.slug !== found.root.slug) {
        resolvedSub = found.leaf.slug;
        resolvedCat = found.root.slug;
      }
    } else {
      const asTag = tags.find((t) => t.slug === resolvedCat);
      if (asTag) {
        resolvedTag = asTag.slug;
        resolvedCat = '';
      }
    }
  }

  if (resolvedCat && !selectedRoot) notice = 'unknown_cat';
  const selectedSub =
    selectedRoot && resolvedSub
      ? findSubcategoryInRoot(selectedRoot, resolvedSub)
      : null;
  if (!notice && resolvedSub && selectedRoot && !selectedSub) notice = 'unknown_sub';
  if (!notice && resolvedTag && !tags.some((t) => t.slug === resolvedTag)) {
    notice = 'unknown_tag';
  }

  if (collection) {
    const col = collections.find((c) => c.slug === collection);
    if (!col) {
      // служебные / скрытые — всё ещё валидны по API
      const all = await fetchCollections().catch(() => null);
      const raw = all?.items?.find((c) => c.slug === collection);
      if (!raw) notice = notice ?? 'unknown_collection';
      else collectionName = raw.name;
    } else {
      collectionName = col.name;
    }
  }

  let title = 'Каталог';
  if (q) title = `Поиск: ${q}`;
  else if (collection) title = collectionName ?? collection;
  else if (selectedSub) title = selectedSub.name;
  else if (selectedRoot) title = selectedRoot.name;
  else if (resolvedTag)
    title = tags.find((t) => t.slug === resolvedTag)?.name ?? 'Каталог';

  const resolved = {
    ...baseOpts,
    cat: resolvedCat,
    sub: resolvedSub,
    tag: resolvedTag,
  };

  if (notice) {
    return {
      categories,
      tags,
      collections,
      products: [],
      total: 0,
      collectionName,
      title,
      notice,
      ...resolved,
    };
  }

  try {
    if (q) {
      const hrefs = await loadSearchProductHits(q);
      total = hrefs.length;
      const start = (page - 1) * limit;
      const slice = hrefs.slice(start, start + limit);
      products = await hydrateSearchHits(slice);
      if (products.length === 0 && slice.length > 0) {
        notice = 'api';
        total = 0;
      }
    } else {
      const categorySlug = resolvedSub || resolvedCat || undefined;
      const res = await getProductEdges({
        page,
        limit,
        category: categorySlug,
        tag: resolvedTag || undefined,
        collection: collection || undefined,
        sort: 'newest',
        sale: sale || undefined,
        priceMin: priceMin ?? undefined,
        priceMax: priceMax ?? undefined,
      });
      total = res.total;
      products = res.edges.map((e) => mapProductNodeToBestSeller(e.node));
    }
  } catch {
    notice = 'api';
    products = [];
    total = 0;
  }

  return {
    categories,
    tags,
    collections,
    products,
    total,
    collectionName,
    title,
    notice,
    ...resolved,
  };
}
