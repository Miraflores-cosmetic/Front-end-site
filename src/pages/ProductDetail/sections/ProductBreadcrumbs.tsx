import React from 'react';
import { Link } from 'react-router-dom';
import { buildCategoryCatalogHref } from '@/lib/categoryCatalogHref';
import styles from '../ProductDetail.module.scss';

type Crumb = { label: string; to?: string };

type CategoryCrumb = {
  name: string;
  slug?: string;
  parent?: { slug: string; parent?: { slug: string } | null } | null;
};

type ProductBreadcrumbsProps = {
  productName: string;
  category?: CategoryCrumb | null;
};

export function ProductBreadcrumbs({ productName, category }: ProductBreadcrumbsProps) {
  const crumbs: Crumb[] = [
    { label: 'Главная', to: '/' },
    { label: 'Каталог', to: '/catalog' },
  ];

  if (category?.name && category.slug) {
    crumbs.push({
      label: category.name,
      to: buildCategoryCatalogHref(category),
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
