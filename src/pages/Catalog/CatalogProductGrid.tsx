import { Link } from 'react-router-dom';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import type { BestSellersProduct } from '@/types/products';
import type { CatalogNotice } from './catalogLoad';
import { catalogHref } from './catalogHref';
import styles from './Catalog.module.scss';

type Props = {
  notice: CatalogNotice;
  loading: boolean;
  products: BestSellersProduct[];
  searchParams: URLSearchParams;
  path: { cat: string; sub: string };
  onRetry: () => void;
};

export function CatalogProductGrid({
  notice,
  loading,
  products,
  searchParams,
  path,
  onRetry,
}: Props) {
  if (notice === 'api') {
    return (
      <div className={styles.empty} role="alert">
        <p className={styles.emptyText}>
          Не удалось загрузить каталог. Попробуйте ещё раз.
        </p>
        <button type="button" className={styles.emptyActionBtn} onClick={onRetry}>
          Повторить
        </button>
      </div>
    );
  }

  if (
    notice === 'unknown_cat' ||
    notice === 'unknown_sub' ||
    notice === 'unknown_tag' ||
    notice === 'unknown_collection'
  ) {
    return (
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
    );
  }

  if (!loading && products.length === 0) {
    return (
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
    );
  }

  return (
    <>
      {products.map((product) => (
        <BestSellerProductCard
          key={product.id}
          product={product}
          loading={false}
          fluid
        />
      ))}
    </>
  );
}
