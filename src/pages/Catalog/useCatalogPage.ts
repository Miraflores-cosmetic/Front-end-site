import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import type { BestSellersProduct } from '@/types/products';
import type { CatalogCollectionPublic } from '@/api/catalogApi';
import { catalogHref, catalogPageSize } from './catalogHref';
import {
  clearCatalogMetaCache,
  loadCatalogPage,
  type CatalogCategoryNode,
  type CatalogPageData,
} from './catalogLoad';
import {
  findCategoryInTree,
  findSubcategoryChainInRoot,
} from '@/lib/categoryCatalogHref';

export type CatalogMeta = Omit<CatalogPageData, 'products' | 'page'>;

export type CatalogCrumb = {
  label: string;
  to?: string;
};

function parseNum(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function sameCatalogUrl(a: string, b: string): boolean {
  try {
    const base = window.location.origin;
    const ua = new URL(a, base);
    const ub = new URL(b, base);
    return (
      decodeURIComponent(ua.pathname.replace(/\/+$/, '') || '/') ===
        decodeURIComponent(ub.pathname.replace(/\/+$/, '') || '/') &&
      ua.search === ub.search
    );
  } catch {
    return a === b;
  }
}

function mergeProducts(
  prev: BestSellersProduct[],
  next: BestSellersProduct[],
): BestSellersProduct[] {
  if (prev.length === 0) return next;
  const seen = new Set(prev.map((p) => p.id));
  const extra = next.filter((p) => !seen.has(p.id));
  return extra.length === 0 ? prev : [...prev, ...extra];
}

/** URL + IO + pagination for PLP. UI stays in Catalog.tsx. */
export function useCatalogPage() {
  const { cat: catParam, sub: subParam } = useParams<{
    cat?: string;
    sub?: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useScreenMatch();
  const pageSize = catalogPageSize(isMobile);
  const [, startTransition] = useTransition();

  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [products, setProducts] = useState<BestSellersProduct[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreLock = useRef(false);
  const requestGen = useRef(0);
  const loadMoreStateRef = useRef({
    meta: null as CatalogMeta | null,
    loading: true,
    loadingMore: false,
    productsLength: 0,
    page: 1,
  });
  loadMoreStateRef.current = {
    meta,
    loading,
    loadingMore,
    productsLength: products.length,
    page,
  };

  const cat = catParam?.trim() || '';
  const sub = subParam?.trim() || '';
  const tag = searchParams.get('tag')?.trim() || '';
  const collection = searchParams.get('collection')?.trim() || '';
  const sale = searchParams.get('sale') === '1';
  const priceMin = parseNum(searchParams.get('priceMin'));
  const priceMax = parseNum(searchParams.get('priceMax'));
  const q = searchParams.get('q')?.trim() || '';

  const filterKey = useMemo(
    () =>
      [
        cat,
        sub,
        tag,
        collection,
        sale ? '1' : '0',
        priceMin ?? '',
        priceMax ?? '',
        q,
        reloadToken,
      ].join('|'),
    [
      cat,
      sub,
      tag,
      collection,
      sale,
      priceMin,
      priceMax,
      q,
      reloadToken,
    ],
  );

  useEffect(() => {
    if (!searchParams.has('page')) return;
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.delete('page');
        return sp;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
  }, [filterKey, isMobile]);

  useEffect(() => {
    let cancelled = false;
    const gen = ++requestGen.current;
    setLoading(true);
    // Не очищаем products до ответа — иначе ложный empty на смене фильтра.
    setPage(1);
    loadMoreLock.current = false;

    loadCatalogPage({
      cat,
      sub,
      tag,
      collection,
      sale,
      priceMin,
      priceMax,
      page: 1,
      q,
      limit: pageSize,
    })
      .then((res) => {
        if (cancelled || gen !== requestGen.current) return;

        const pathChanged = res.cat !== cat || res.sub !== sub;
        const tagPromoted = Boolean(cat && !res.cat && res.tag && res.tag !== tag);
        if (!res.notice && (pathChanged || tagPromoted)) {
          const next = catalogHref(
            searchParams,
            { tag: res.tag || null },
            { cat: res.cat || undefined, sub: res.sub || undefined },
          );
          const current = `${window.location.pathname}${window.location.search}`;
          if (!sameCatalogUrl(next, current)) {
            navigate(next, { replace: true });
            return;
          }
        }

        const { products: pageProducts, page: _p, ...rest } = res;
        setMeta(rest);
        setProducts(pageProducts);
        setPage(1);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled || gen !== requestGen.current) return;
        setMeta({
          categories: [],
          tags: [],
          collections: [],
          total: 0,
          limit: pageSize,
          cat,
          sub,
          tag,
          collection,
          collectionName: null,
          sale,
          priceMin,
          priceMax,
          q,
          title: q ? `Поиск: ${q}` : 'Каталог',
          notice: 'api',
        });
        setProducts([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const hasMore =
    Boolean(meta) &&
    !meta?.notice &&
    products.length < (meta?.total ?? 0);

  const loadNextPage = useCallback(async () => {
    const s = loadMoreStateRef.current;
    if (!s.meta || s.meta.notice || s.loading || s.loadingMore) return;
    if (loadMoreLock.current) return;
    if (s.productsLength >= s.meta.total) return;
    const limit = s.meta.limit;
    if (!limit) return;

    const nextPage = s.page + 1;
    const gen = requestGen.current;
    loadMoreLock.current = true;
    setLoadingMore(true);

    try {
      const res = await loadCatalogPage({
        cat: s.meta.cat,
        sub: s.meta.sub,
        tag: s.meta.tag,
        collection: s.meta.collection,
        sale: s.meta.sale,
        priceMin: s.meta.priceMin,
        priceMax: s.meta.priceMax,
        page: nextPage,
        q: s.meta.q,
        limit,
      });
      if (gen !== requestGen.current) return;
      if (res.notice === 'api') return;
      setProducts((prev) => mergeProducts(prev, res.products));
      setPage(nextPage);
      setMeta((prev) =>
        prev ? { ...prev, total: res.total, limit: res.limit } : prev,
      );
    } finally {
      if (gen === requestGen.current) {
        setLoadingMore(false);
        loadMoreLock.current = false;
      }
    }
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadNextPage();
        }
      },
      { root: null, rootMargin: '400px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadNextPage]);

  const patchParams = useCallback(
    (patch: Record<string, string | null>, opts?: { scroll?: boolean }) => {
      startTransition(() => {
        setSearchParams(
          (prev) => {
            const sp = new URLSearchParams(prev);
            sp.delete('cat');
            sp.delete('sub');
            sp.delete('page');
            for (const [k, v] of Object.entries(patch)) {
              if (k === 'cat' || k === 'sub' || k === 'page') continue;
              if (v == null || v === '') sp.delete(k);
              else sp.set(k, v);
            }
            return sp;
          },
          { replace: true },
        );
        if (opts?.scroll) {
          window.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
        }
      });
    },
    [isMobile, setSearchParams],
  );

  const selectCollection = useCallback(
    (slug: string | null) => {
      startTransition(() => {
        navigate(
          catalogHref(
            searchParams,
            {
              collection: slug,
              cat: null,
              sub: null,
              q: null,
            },
            {},
          ),
          { replace: true },
        );
        window.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
      });
    },
    [isMobile, navigate, searchParams],
  );

  const retryLoad = useCallback(() => {
    clearCatalogMetaCache();
    setReloadToken((n) => n + 1);
  }, []);

  const categories = meta?.categories ?? [];
  const tags = meta?.tags ?? [];
  const collections: CatalogCollectionPublic[] = meta?.collections ?? [];

  const chrome = useMemo(() => {
    let resolvedCat = cat;
    let resolvedSub = sub;
    let selectedRoot: CatalogCategoryNode | null = resolvedCat
      ? (categories.find((c) => c.slug === resolvedCat) ?? null)
      : null;

    if (resolvedCat && !selectedRoot && !resolvedSub) {
      const found = findCategoryInTree(categories, resolvedCat);
      if (found) {
        selectedRoot = found.root as CatalogCategoryNode;
        if (found.leaf.slug !== found.root.slug) {
          resolvedSub = found.leaf.slug;
          resolvedCat = found.root.slug;
        }
      }
    }

    const subChain = selectedRoot && resolvedSub
      ? (findSubcategoryChainInRoot(selectedRoot, resolvedSub) as CatalogCategoryNode[])
      : [];

    let title = 'Каталог';
    if (q) title = `Поиск: ${q}`;
    else if (collection) {
      title =
        collections.find((c) => c.slug === collection)?.name ??
        meta?.collectionName ??
        collection;
    } else if (subChain.length) title = subChain[subChain.length - 1].name;
    else if (selectedRoot) title = selectedRoot.name;
    else if (tag) title = tags.find((t) => t.slug === tag)?.name ?? 'Каталог';

    const crumbs: CatalogCrumb[] = [];
    if (collection || q || tag || selectedRoot) {
      crumbs.push({ label: 'Каталог', to: '/catalog' });
    }
    if (q || collection) {
      crumbs.push({ label: title });
    } else if (selectedRoot) {
      if (!resolvedSub) {
        crumbs.push({ label: selectedRoot.name });
      } else {
        crumbs.push({
          label: selectedRoot.name,
          to: catalogHref(searchParams, { sub: null, q: null }, { cat: selectedRoot.slug }),
        });
        subChain.forEach((node, i) => {
          const isLast = i === subChain.length - 1;
          crumbs.push(
            isLast
              ? { label: node.name }
              : {
                  label: node.name,
                  to: catalogHref(
                    searchParams,
                    { sub: node.slug, q: null },
                    { cat: selectedRoot.slug },
                  ),
                },
          );
        });
      }
    } else if (tag) {
      crumbs.push({ label: title });
    } else {
      crumbs.push({ label: 'Каталог' });
    }

    return {
      cat: resolvedCat,
      sub: resolvedSub,
      selectedRoot,
      subChain,
      title,
      crumbs,
    };
  }, [
    cat,
    sub,
    tag,
    collection,
    q,
    categories,
    tags,
    collections,
    meta?.collectionName,
    searchParams,
  ]);

  const selectedRoot = chrome.selectedRoot;
  const bubbles = selectedRoot
    ? selectedRoot.children ?? []
    : categories;
  const path = useMemo(
    () => ({ cat: chrome.cat, sub: chrome.sub }),
    [chrome.cat, chrome.sub],
  );

  const resultsMatch = Boolean(
    meta &&
      meta.cat === chrome.cat &&
      meta.sub === chrome.sub &&
      meta.tag === tag &&
      meta.collection === collection &&
      meta.q === q &&
      meta.sale === sale &&
      meta.priceMin === priceMin &&
      meta.priceMax === priceMax,
  );

  const title = chrome.title;
  const notice = resultsMatch ? meta?.notice ?? null : null;
  const firstLoad = loading && !meta;

  return {
    isMobile,
    searchParams,
    path,
    cat: chrome.cat,
    sub: chrome.sub,
    tag,
    collection,
    sale,
    priceMin,
    priceMax,
    q,
    meta,
    products,
    collections,
    page,
    pageSize,
    loading,
    loadingMore,
    hasMore,
    firstLoad,
    title,
    notice,
    crumbs: chrome.crumbs,
    resultsMatch,
    selectedRoot,
    bubbles,
    sentinelRef,
    patchParams,
    selectCollection,
    retryLoad,
    loadNextPage,
  };
}
