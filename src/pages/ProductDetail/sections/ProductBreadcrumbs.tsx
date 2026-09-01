import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../ProductDetail.module.scss';

type Crumb = { label: string; to?: string };

type ProductBreadcrumbsProps = {
  productName: string;
  category?: { id: string; name: string; slug?: string } | null;
};

export function ProductBreadcrumbs({ productName, category }: ProductBreadcrumbsProps) {
  const crumbs: Crumb[] = [
    { label: 'Главная', to: '/' },
    { label: 'Каталог', to: '/catalog' },
  ];

  if (category?.name && category.slug) {
    crumbs.push({
      label: category.name,
      to: `/catalog/${encodeURIComponent(category.slug)}`,
    });
  } else if (category?.name) {
    crumbs.push({ label: category.name });
  }

  crumbs.push({ label: productName });

  return (
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
      <ol className={styles.breadcrumbsList}>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={styles.breadcrumbItem}>
              {c.to && !last ? (
                <Link to={c.to} className={styles.breadcrumbLink}>
                  {c.label}
                </Link>
              ) : (
                <span className={styles.breadcrumbCurrent} aria-current={last ? 'page' : undefined}>
                  {c.label}
                </span>
              )}
              {!last ? (
                <span className={styles.breadcrumbSep} aria-hidden>
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
