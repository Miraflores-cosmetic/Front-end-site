import { useEffect } from 'react';

type DocumentSeoInput = {
  title: string;
  description?: string;
  imageUrl?: string;
  canonicalPath?: string;
  /** Open Graph type — default website */
  ogType?: 'website' | 'article' | 'product';
  /** meta robots noindex,nofollow */
  noIndex?: boolean;
  /** Если true — title без суффикса « — Miraflores» (готовый metaTitle) */
  titleAsIs?: boolean;
  /** Суффикс бренда; по умолчанию Miraflores */
  titleSuffix?: string;
  /** Базовый URL для canonical (из SiteSettings.siteUrl) */
  siteUrl?: string | null;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeLink(rel: string) {
  document.head.querySelector(`link[rel="${rel}"]`)?.remove();
}

/** document.title + description / Open Graph / canonical (без react-helmet). */
export function useDocumentSeo({
  title,
  description,
  imageUrl,
  canonicalPath,
  ogType = 'website',
  noIndex = false,
  titleAsIs = false,
  titleSuffix = 'Miraflores',
  siteUrl,
}: DocumentSeoInput) {
  useEffect(() => {
    if (!title.trim()) return;

    const prevTitle = document.title;
    const suffix = titleSuffix.trim() || 'Miraflores';
    const fullTitle = titleAsIs ? title.trim() : `${title.trim()} — ${suffix}`;
    document.title = fullTitle;

    const desc =
      description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) ||
      title.trim();

    const origin =
      (siteUrl?.replace(/\/+$/, '') || '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const url =
      canonicalPath && origin
        ? `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
        : typeof window !== 'undefined'
          ? window.location.href
          : '';
    const image =
      imageUrl && origin && imageUrl.startsWith('/')
        ? `${origin}${imageUrl}`
        : imageUrl || '';

    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    if (url) upsertMeta('property', 'og:url', url);
    if (image) upsertMeta('property', 'og:image', image);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    if (image) upsertMeta('name', 'twitter:image', image);
    if (url) upsertLink('canonical', url);

    if (noIndex) {
      upsertMeta('name', 'robots', 'noindex,nofollow');
    } else {
      removeMeta('name', 'robots');
    }

    return () => {
      document.title = prevTitle || suffix;
      removeMeta('name', 'robots');
      removeLink('canonical');
    };
  }, [title, description, imageUrl, canonicalPath, ogType, noIndex, titleAsIs, titleSuffix, siteUrl]);
}
