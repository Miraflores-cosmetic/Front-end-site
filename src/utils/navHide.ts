/** Hide rules for header left-nav and menu drawer catalog (keep in sync). */

const HIDE_SLUGS = (() => {
  const fromEnv = import.meta.env.VITE_HIDE_HEADER_CATEGORY_SLUG;
  const envSlugs = fromEnv
    ? String(fromEnv)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : ['podarochnye-sertifikaty'];
  return new Set([
    ...envSlugs,
    'uncategorized',
    'bez-kategorii',
    'ekotovary',
    'eko-tovary',
    'ecotovary',
    'eko_tovary',
  ]);
})();

const HIDE_NAME_PARTS = ['без категори', 'экотовар', 'ekotovary', 'eko-tovary', 'eco-tovary'];

export function isHiddenInNav(item: { name?: string; category: { slug?: string } }): boolean {
  if (HIDE_SLUGS.has(item.category.slug ?? '')) return true;
  const nameLower = (item.name ?? '').toLowerCase();
  return HIDE_NAME_PARTS.some((part) => nameLower.includes(part));
}
