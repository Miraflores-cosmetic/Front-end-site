const PRODUCT_SLUG_RE = /\/product\/([^/?#]+)/gi;
const REMEDY_MARKER = /(?:\*{1,2})?Средство(?:\*{1,2})?\s*:/i;

function plainToIntroHtml(text: string): string {
  if (!text.trim()) return '';

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const processed = line
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      return `<p>${processed}</p>`;
    })
    .join('');
}

/** Извлекает slug товаров из markdown/HTML ссылок на /product/{slug}. */
export function extractProductSlugs(text: string): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(PRODUCT_SLUG_RE.source, 'gi');

  for (const match of text.matchAll(re)) {
    const slug = decodeURIComponent(match[1]).trim();
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }

  return slugs;
}

/**
 * Делит контент ключа (как в Google Sheets): вводный текст + ссылки на товары.
 * Вводный текст — до первого «Средство:»; товары — slug из ссылок.
 */
export function splitQuizIntroAndProducts(
  html: string,
  plain: string,
): { introHtml: string; productSlugs: string[] } {
  const combined = `${plain}\n${html}`;
  const productSlugs = extractProductSlugs(combined);

  if (productSlugs.length === 0) {
    return { introHtml: html, productSlugs: [] };
  }

  const plainMarker = plain.search(REMEDY_MARKER);
  if (plainMarker >= 0) {
    const introPlain = plain.slice(0, plainMarker).trim();
    const introHtml = plainToIntroHtml(introPlain);
    if (introHtml) return { introHtml, productSlugs };
  }

  const htmlMarker = html.search(/Средство/i);
  if (htmlMarker >= 0) {
    return { introHtml: html.slice(0, htmlMarker).trim(), productSlugs };
  }

  const introHtml = html
    .replace(/<a\s[^>]*href="[^"]*\/product\/[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
    .trim();

  return { introHtml, productSlugs };
}
