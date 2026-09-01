import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import type { BestSellersProduct } from '@/types/products';
import { CatalogBubbles } from './CatalogBubbles';
import { CatalogFilters } from './CatalogFilters';
import { catalogHref, catalogPageSize } from './catalogHref';
import {
  clearCatalogMetaCache,
  loadCatalogPage,
  type CatalogPageData,
} from './catalogLoad';
import styles from './Catalog.module.scss';

function productsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'продукт';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'продукта';
  return 'продуктов';
}

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

function CatalogSkeletonGrid({ count }: { count: number }) {
  return (
    <div className={styles.grid} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLineShort} />
        </div>
      ))}
    </div>
  );
}

type CatalogMeta = Omit<CatalogPageData, 'products' | 'page'>;

const Catalog: React.FC = () => {
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

  const cat = catParam?.trim() || '';
  const sub = subParam?.trim() || '';
  const tag = searchParams.get('tag')?.trim() || '';
  const collection = searchParams.get('collection')?.trim() || '';
  const sale = searchParams.get('sale') === '1';
  const priceMin = parseNum(searchParams.get('priceMin'));
  const priceMax = parseNum(searchParams.get('priceMax'));
  const q = searchParams.get('q')?.trim() || '';

  const path = useMemo(() => ({ cat, sub }), [cat, sub]);

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
        pageSize,
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
      pageSize,
      reloadToken,
    ],
  );

  // Сброс URL ?page= — автоподгрузка не использует page в query
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

  // Первая страница / смена фильтров
  useEffect(() => {
    let cancelled = false;
    const gen = ++requestGen.current;
    setLoading(true);
    setProducts([]);
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
    if (!meta || meta.notice || loading || loadingMore) return;
    if (loadMoreLock.current) return;
    if (products.length >= meta.total) return;

    const nextPage = page + 1;
    const gen = requestGen.current;
    loadMoreLock.current = true;
    setLoadingMore(true);

    try {
      const res = await loadCatalogPage({
        cat: meta.cat,
        sub: meta.sub,
        tag: meta.tag,
        collection: meta.collection,
        sale: meta.sale,
        priceMin: meta.priceMin,
        priceMax: meta.priceMax,
        page: nextPage,
        q: meta.q,
        limit: pageSize,
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
  }, [meta, loading, loadingMore, products.length, page, pageSize]);

  // IntersectionObserver — автоподгрузка
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
  }, [hasMore, loading, loadingMore, loadNextPage, products.length]);

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

  const retryLoad = useCallback(() => {
    clearCatalogMetaCache();
    setReloadToken((n) => n + 1);
  }, []);

  const selectedRoot = useMemo(() => {
    if (!meta) return null;
    return meta.categories.find((c) => c.slug === meta.cat) ?? null;
  }, [meta]);

  const bubbles = selectedRoot
    ? selectedRoot.children ?? []
    : meta?.categories ?? [];

  const title = meta?.title ?? 'Каталог';
  const notice = meta?.notice ?? null;
  const firstLoad = loading && !meta;

  return (
    <main className={styles.faceContainer}>
      <nav className={styles.crumbs} aria-label="Навигация">
        <Link to="/">Главная</Link>
        <span aria-hidden> / </span>
        {meta?.collection ? (
          <>
            <Link to="/catalog" className={styles.crumbBtn}>
              Каталог
            </Link>
            <span aria-hidden> / </span>
            <span>{title}</span>
          </>
        ) : selectedRoot ? (
          <>
            <Link to="/catalog" className={styles.crumbBtn}>
              Каталог
            </Link>
            <span aria-hidden> / </span>
            {meta?.sub ? (
              <>
                <Link
                  to={catalogHref(searchParams, { sub: null }, path)}
                  className={styles.crumbBtn}
                >
                  {selectedRoot.name}
                </Link>
                <span aria-hidden> / </span>
                <span>{title}</span>
              </>
            ) : (
              <span>{selectedRoot.name}</span>
            )}
          </>
        ) : q || tag ? (
          <>
            <Link to="/catalog" className={styles.crumbBtn}>
              Каталог
            </Link>
            <span aria-hidden> / </span>
            <span>{title}</span>
          </>
        ) : (
          <span>Каталог</span>
        )}
      </nav>

      <h1 className={styles.title}>{title}</h1>

      {firstLoad ? (
        <>
          <div className={styles.bubblesWrap} aria-hidden>
            <ul className={styles.bubbles}>
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i}>
                  <span className={styles.bubble}>
                    <span className={styles.bubblePh} />
                    <span className={styles.bubbleLabel}>····</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <CatalogSkeletonGrid count={isMobile ? 4 : 6} />
        </>
      ) : (
        <>
          {!q ? (
            <CatalogBubbles
              bubbles={bubbles}
              selectedRoot={selectedRoot}
              cat={meta?.cat ?? cat}
              sub={meta?.sub ?? sub}
              searchParams={searchParams}
              path={{ cat: meta?.cat ?? cat, sub: meta?.sub ?? sub }}
            />
          ) : null}

          <div className={styles.toolbar}>
            <p className={styles.count} aria-live="polite">
              {notice || loading
                ? null
                : `${(meta?.total ?? 0).toLocaleString('ru-RU')} ${productsWord(meta?.total ?? 0)}`}
            </p>
          </div>

          {!q ? (
            <div className={styles.chipsSticky}>
              <CatalogFilters
                tags={meta?.tags ?? []}
                tag={meta?.tag ?? tag}
                sale={sale}
                priceMin={priceMin}
                priceMax={priceMax}
                showClearCategory={Boolean(selectedRoot || meta?.collection)}
                clearCategoryLabel={
                  meta?.collection ? 'сбросить коллекцию' : 'сбросить категорию'
                }
                searchParams={searchParams}
                path={{ cat: meta?.cat ?? cat, sub: meta?.sub ?? sub }}
                patchParams={patchParams}
              />
            </div>
          ) : null}

          <div
            className={styles.grid}
            data-pending={loading || undefined}
          >
            {notice === 'api' ? (
              <div className={styles.empty} role="alert">
                <p className={styles.emptyText}>
                  Не удалось загрузить каталог. Попробуйте ещё раз.
                </p>
                <button
                  type="button"
                  className={styles.emptyActionBtn}
                  onClick={retryLoad}
                >
                  Повторить
                </button>
              </div>
            ) : notice === 'unknown_cat' ||
              notice === 'unknown_sub' ||
              notice === 'unknown_tag' ||
              notice === 'unknown_collection' ? (
              <div className={styles.empty} role="status">
                <p className={styles.emptyText}>
                  {notice === 'unknown_cat'
                    ? 'Категория не найдена.'
                    : notice === 'unknown_sub'
                      ? 'Подкатегория не найдена.'
                      : notice === 'unknown_tag'
                        ? 'Область применения не найдена.'
                        : 'Коллекция не найдена.'}
                </p>
                <Link to="/catalog" className={styles.emptyAction}>
                  Сбросить фильтры
                </Link>
              </div>
            ) : products.length === 0 ? (
              <div className={styles.empty} role="status">
                <p className={styles.emptyText}>Ничего не найдено</p>
                <Link
                  to={catalogHref(
                    searchParams,
                    {
                      cat: null,
                      sub: null,
                      tag: null,
                      collection: null,
                      sale: null,
                      priceMin: null,
                      priceMax: null,
                      q: null,
                    },
                    path,
                  )}
                  className={styles.emptyAction}
                >
                  Сбросить фильтры
                </Link>
              </div>
            ) : (
              products.map((product) => (
                <BestSellerProductCard
                  key={product.id}
                  product={product}
                  loading={false}
                  fluid
                />
              ))
            )}
          </div>

          {!notice && products.length > 0 ? (
            <div className={styles.loadMore} aria-live="polite">
              {hasMore ? (
                <div
                  ref={sentinelRef}
                  className={styles.loadMoreSentinel}
                  aria-hidden
                />
              ) : null}
              {loadingMore ? (
                <p className={styles.loadMoreStatus}>Загрузка…</p>
              ) : hasMore ? (
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={() => void loadNextPage()}
                >
                  Показать ещё
                </button>
              ) : (
                <p className={styles.loadMoreStatus}>Все товары загружены</p>
              )}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
};

export default Catalog;
