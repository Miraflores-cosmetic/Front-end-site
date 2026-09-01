/** Публичные /info/:slug (Saleor-стиль) → Nest CmsPage.slug */
export const INFO_CMS_SLUG_ALIASES: Record<string, string> = {
  'politika-konfidentsialnosti': 'privacy',
  privacy: 'privacy',
  'oferta-i-usloviia-polzovaniia': 'terms',
  terms: 'terms',
  'oplata-i-dostavka': 'delivery',
  delivery: 'delivery',
};

/** Канонические CMS-slug'и юр. страниц. */
export const CMS_LEGAL_SLUGS = ['privacy', 'terms', 'delivery'] as const;

export function resolveInfoCmsSlug(publicSlug: string): string | null {
  const key = publicSlug.trim().toLowerCase();
  if (!key) return null;
  return INFO_CMS_SLUG_ALIASES[key] ?? null;
}
