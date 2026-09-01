import { useEffect, useState } from 'react';
import { getSiteSeoSettings, type SiteSeoSettings } from '@/api/settingsApi';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

const DEFAULTS: SiteSeoSettings = {
  siteUrl: null,
  titleSuffix: 'Miraflores',
  defaultMetaDescription: null,
  defaultOgImageUrl: null,
  homeMetaTitle: null,
  homeMetaDescription: null,
  homeOgImageUrl: null,
};

/** SEO главной страницы из SiteSettings. */
export function useHomeSeo() {
  const [settings, setSettings] = useState<SiteSeoSettings>(DEFAULTS);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const row = await getSiteSeoSettings();
        if (alive) setSettings(row);
      } catch {
        /* fallback defaults */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const title = settings.homeMetaTitle?.trim() || settings.titleSuffix;
  const titleAsIs = Boolean(settings.homeMetaTitle?.trim());

  useDocumentSeo({
    title,
    titleAsIs,
    titleSuffix: settings.titleSuffix,
    description:
      settings.homeMetaDescription?.trim() ||
      settings.defaultMetaDescription?.trim() ||
      undefined,
    imageUrl: settings.homeOgImageUrl || settings.defaultOgImageUrl || undefined,
    canonicalPath: '/',
    siteUrl: settings.siteUrl,
  });
}
