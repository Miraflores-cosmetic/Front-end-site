import { Link } from 'react-router-dom';
import { CatalogBubbles } from './CatalogBubbles';
import { CatalogFilters } from './CatalogFilters';
import { CatalogProductGrid } from './CatalogProductGrid';
import { useCatalogPage } from './useCatalogPage';
import { useCatalogSeo } from './useCatalogSeo';
import styles from './Catalog.module.scss';

function productsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'продукт';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'продукта';
  return 'продуктов';
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

function CatalogItemListJsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

const Catalog: React.FC = () => {
  const {
    isMobile,
    searchParams,
    path,
    cat,
    sub,
    tag,
    collection,
    sale,
    priceMin,
    priceMax,
    q,
    meta,
    products,
    collections,
    loading,
    loadingMore,
    hasMore,
    firstLoad,
    title,
    notice,
    crumbs,
    resultsMatch,
    selectedRoot,
    bubbles,
    sentinelRef,
    patchParams,
    selectCollection,
    retryLoad,
    loadNextPage,
  } = useCatalogPage();

  const { itemListJsonLd } = useCatalogSeo({
    title,
    notice,
    cat,
    sub,
    tag,
    collection,
    q,
    products: resultsMatch ? products : [],
  });

  return (
    <main className={styles.faceContainer}>
      {itemListJsonLd ? <CatalogItemListJsonLd data={itemListJsonLd} /> : null}

      <nav className={styles.crumbs} aria-label="Навигация">
        <Link to="/">Главная</Link>
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`}>
            <span aria-hidden> / </span>
            {c.to ? (
              <Link to={c.to} className={styles.crumbBtn}>
                {c.label}
              </Link>
            ) : (
              <span>{c.label}</span>
            )}
          </span>
        ))}
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
              cat={cat}
              sub={sub}
              searchParams={searchParams}
              path={path}
            />
          ) : null}

          <div className={styles.toolbar}>
            <p className={styles.count} aria-live="polite">
              {notice || loading || !resultsMatch
                ? null
                : `${(meta?.total ?? 0).toLocaleString('ru-RU')} ${productsWord(meta?.total ?? 0)}`}
            </p>
          </div>

          {!q ? (
            <div className={styles.chipsSticky}>
              <CatalogFilters
                tags={meta?.tags ?? []}
                tag={tag}
                collections={collections}
                collection={collection}
                sale={sale}
                priceMin={priceMin}
                priceMax={priceMax}
                patchParams={patchParams}
                onSelectCollection={selectCollection}
              />
            </div>
          ) : null}

          <div className={styles.grid} data-pending={loading || undefined}>
            <CatalogProductGrid
              notice={notice}
              loading={loading}
              products={products}
              searchParams={searchParams}
              path={path}
              onRetry={retryLoad}
            />
          </div>

          {!notice && products.length > 0 ? (
            <div className={styles.loadMore} aria-live="polite">
              {hasMore && resultsMatch ? (
                <div
                  ref={sentinelRef}
                  className={styles.loadMoreSentinel}
                  aria-hidden
                />
              ) : null}
              {loadingMore ? (
                <p className={styles.loadMoreStatus}>Загрузка…</p>
              ) : hasMore && resultsMatch ? (
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={() => void loadNextPage()}
                >
                  Показать ещё
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
};

export default Catalog;
