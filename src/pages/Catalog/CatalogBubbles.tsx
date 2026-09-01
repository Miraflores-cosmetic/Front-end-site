import { Link } from 'react-router-dom';
import type { CatalogCategoryNode } from './catalogLoad';
import { catalogHref } from './catalogHref';
import styles from './Catalog.module.scss';

export function CatalogBubbles({
  bubbles,
  selectedRoot,
  cat,
  sub,
  searchParams,
  path,
}: {
  bubbles: CatalogCategoryNode[];
  selectedRoot: CatalogCategoryNode | null;
  cat: string;
  sub: string;
  searchParams: URLSearchParams;
  path: { cat?: string; sub?: string };
}) {
  if (bubbles.length === 0) return null;

  return (
    <div className={styles.bubblesWrap}>
      <ul className={styles.bubbles} role="list">
        {selectedRoot ? (
          <li>
            {!sub ? (
              <span className={styles.bubble} data-active aria-current="page">
                <span className={styles.bubblePh} aria-hidden />
                <span className={styles.bubbleLabel}>Все</span>
              </span>
            ) : (
              <Link
                to={catalogHref(searchParams, { sub: null, q: null }, path)}
                className={styles.bubble}
              >
                <span className={styles.bubblePh} aria-hidden />
                <span className={styles.bubbleLabel}>Все</span>
              </Link>
            )}
          </li>
        ) : null}
        {bubbles.map((b) => {
          const active = selectedRoot ? sub === b.slug : cat === b.slug;
          const href = selectedRoot
            ? catalogHref(searchParams, { sub: b.slug, q: null }, path)
            : catalogHref(searchParams, { cat: b.slug, sub: null, q: null }, path);
          return (
            <li key={b.id}>
              {active ? (
                <span className={styles.bubble} data-active aria-current="page">
                  {b.imageUrl ? (
                    <img className={styles.bubbleImg} src={b.imageUrl} alt="" />
                  ) : (
                    <span className={styles.bubblePh} aria-hidden />
                  )}
                  <span className={styles.bubbleLabel}>{b.name}</span>
                </span>
              ) : (
                <Link to={href} className={styles.bubble}>
                  {b.imageUrl ? (
                    <img className={styles.bubbleImg} src={b.imageUrl} alt="" />
                  ) : (
                    <span className={styles.bubblePh} aria-hidden />
                  )}
                  <span className={styles.bubbleLabel}>{b.name}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
