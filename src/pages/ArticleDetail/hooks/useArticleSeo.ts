import { useEffect, useState } from 'react';
import { getSiteSeoSettings } from '@/api/settingsApi';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

type ArticleSeoInput = {
  title: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalPath?: string | null;
  seoNoIndex?: boolean;
};

/** document.title + meta / OG для страницы статьи блога. */
export function useArticleSeo(input: ArticleSeoInput) {
  const [site, setSite] = useState<{ titleSuffix: string; siteUrl: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (!input.title.trim()) return;
    let alive = true;
    void (async () => {
      try {
        const row = await getSiteSeoSettings();
        if (alive) {
          setSite({ titleSuffix: row.titleSuffix, siteUrl: row.siteUrl });
        }
      } catch {
        /* defaults in useDocumentSeo */
      }
    })();
    return () => {
      alive = false;
    };
  }, [input.title]);

  const metaTitle = input.metaTitle?.trim();
  const metaDescription = input.metaDescription?.trim();
  const ogImage = input.ogImageUrl?.trim();

  useDocumentSeo({
    title: input.title.trim() ? metaTitle || input.title : '',
    description: metaDescription || input.description || undefined,
    imageUrl: ogImage || input.imageUrl || undefined,
    canonicalPath:
      input.canonicalPath?.trim() ||
      (input.slug ? `/articles/${input.slug}` : undefined),
    noIndex: Boolean(input.seoNoIndex),
    titleAsIs: Boolean(metaTitle),
    ogType: 'article',
    titleSuffix: site?.titleSuffix,
    siteUrl: site?.siteUrl,
  });
}
