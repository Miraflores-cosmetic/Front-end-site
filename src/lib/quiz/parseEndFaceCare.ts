const CATEGORY_NABORY_URL_RE = /https?:\/\/[^\s<"]*\/category\/nabory[^\s<"]*/gi;
const CATEGORY_NABORY_LINK_RE = /<a[^>]*href="[^"]*\/category\/nabory[^"]*"[^>]*>[\s\S]*?<\/a>/gi;

export function hasNaboryCategoryLink(text: string): boolean {
  return /\/category\/nabory/i.test(text);
}

export function stripNaboryLinkFromPlain(plain: string): string {
  return plain.replace(CATEGORY_NABORY_URL_RE, '').replace(/\s+/g, ' ').trim();
}

export function stripNaboryLinkFromHtml(html: string): string {
  return html
    .replace(CATEGORY_NABORY_LINK_RE, '')
    .replace(CATEGORY_NABORY_URL_RE, '')
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    .trim();
}
