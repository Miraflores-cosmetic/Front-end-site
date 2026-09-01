import { useEffect, useState } from 'react';
import { getSiteSeoSettings } from '@/api/settingsApi';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

type ProductSeoInput = {
  title: string;
  description?: string;
  imageUrl?: string;
  canonicalPath?: string;
  noIndex?: boolean;
  titleAsIs?: boolean;
  titleSuffix?: string;
  siteUrl?: string | null;
};

/** document.title + description / Open Graph для PDP (без react-helmet). */
export function useProductSeo(input: ProductSeoInput) {
  const [site, setSite] = useState<{ titleSuffix: string; siteUrl: string | null } | null>(
    null,
  );

  useEffect(() => {
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
  }, []);

  useDocumentSeo({
    ...input,
    ogType: 'product',
    titleSuffix: input.titleSuffix ?? site?.titleSuffix,
    siteUrl: input.siteUrl ?? site?.siteUrl,
  });
}
