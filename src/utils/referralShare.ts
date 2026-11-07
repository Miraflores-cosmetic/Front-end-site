/** Absolute referral URL with UTM for TG / Stories / copy. */
export function buildReferralShareUrl(opts: {
  origin: string;
  linkPath: string;
  medium?: 'copy' | 'telegram' | 'stories' | 'share';
}): string {
  const origin = opts.origin.replace(/\/+$/, '');
  const path = opts.linkPath.startsWith('/') ? opts.linkPath : `/${opts.linkPath}`;
  const url = new URL(`${origin}${path}`);
  url.searchParams.set('utm_source', 'referral');
  url.searchParams.set('utm_medium', opts.medium || 'share');
  url.searchParams.set('utm_campaign', 'mf_wallet');
  return url.toString();
}

/**
 * Fill shareTextTemplate placeholders {link} {code}.
 * omitLink: для TG share (url уже в query) — без дубля ссылки в text.
 */
export function fillReferralShareText(
  template: string,
  opts: { link: string; code: string; omitLink?: boolean },
): string {
  let text = template || 'Закажи в Miraflores по моей ссылке: {link}';
  if (opts.omitLink) {
    text = text
      .split('{link}')
      .join('')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/:\s*$/g, '')
      .trim();
  } else {
    text = text.split('{link}').join(opts.link);
  }
  return text.split('{code}').join(opts.code);
}
