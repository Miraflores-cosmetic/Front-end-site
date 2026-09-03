import { useEffect, useMemo, useState } from 'react';
import { getSiteSeoSettings } from '@/api/settingsApi';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';
import type { BestSellersProduct } from '@/types/products';
import { catalogHref } from './catalogHref';
import type { CatalogNotice } from './catalogLoad';

/** Title + canonical + OG в runtime (браузер / Google JS).
 *  Telegram/VK/превью не исполняют JS — см. GET /catalog/open-graph + nginx share-bot. */
export function useCatalogSeo(opts: {
  title: string;
  notice: CatalogNotice;
  cat: string;
  sub: string;
  tag: string;
  collection: string;
  q: string;
  products: BestSellersProduct[];
}) {
  const [site, setSite] = useState<{
    titleSuffix: string;
    siteUrl: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    void getSiteSeoSettings()
      .then((row) => {
        if (alive) {
          setSite({ titleSuffix: row.titleSuffix, siteUrl: row.siteUrl });
        }
      })
      .catch(() => {
        /* defaults in useDocumentSeo */
      });
    return () => {
      alive = false;
    };
  }, []);

  const label = opts.title.trim() || 'Каталог';
  const isSearch = Boolean(opts.q);
  const isError = Boolean(opts.notice);

  const canonicalPath = useMemo(() => {
    // SEO-лендинги: collection/tag в canonical; sale/price/q/page — нет.
    const path = catalogHref(
      new URLSearchParams(),
      {
        collection: opts.collection || null,
        tag: opts.tag || null,
      },
      { cat: opts.cat || undefined, sub: opts.sub || undefined },
    );
    return path;
  }, [opts.cat, opts.sub, opts.tag, opts.collection]);

  useDocumentSeo({
    title: label,
    description: isSearch
      ? `Результаты поиска «${opts.q}» в каталоге Miraflores`
      : `Купить ${label.toLowerCase()} в Miraflores`,
    canonicalPath: isSearch || isError ? undefined : canonicalPath,
    noIndex: isSearch || isError,
    titleSuffix: site?.titleSuffix,
    siteUrl: site?.siteUrl,
  });

  const itemListJsonLd = useMemo(() => {
    if (isSearch || isError || opts.products.length === 0) return null;
    const origin =
      site?.siteUrl?.replace(/\/+$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    if (!origin) return null;
    const pageUrl = `${origin}${canonicalPath}`;
    const listed = opts.products;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      url: pageUrl,
      numberOfItems: listed.length,
      itemListElement: listed.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${origin}/product/${encodeURIComponent(p.slug)}`,
        name: p.title,
      })),
    };
  }, [
    isSearch,
    isError,
    opts.products,
    site?.siteUrl,
    canonicalPath,
  ]);

  return { itemListJsonLd };
}
