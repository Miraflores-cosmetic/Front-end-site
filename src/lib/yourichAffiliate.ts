/**
 * YouRich (PRM Business) attribution for checkout.
 * Tracker: https://cabinet.prmbusiness.ru/scripts/track.js
 * Cookies: _yr_rlh (ref hash), _yr_uid (fingerprint); LS fallback yr_fallback_* .
 * Own ?yr= capture: tracker starts only after first click/tap, SPA may strip query.
 */

export type YourichAffiliate = {
  refHash?: string;
  extUserId?: string;
};

const COOKIE_REF_HASH = '_yr_rlh';
const COOKIE_UID = '_yr_uid';
const LS_OUR_REF = 'miraflores.yr.ref.v1';
const LS_FIRST_CAMPAIGN = 'yr_first_campaign';
/** Same TTL as track.js default (60 days). */
export const YOURICH_REF_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const MAX_LEN = 128;

type TimedValue = { value: string; exp: number };

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${esc}=([^;]*)`));
    if (!m?.[1]) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  } catch {
    return null;
  }
}

function readTimedLocalStorage(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as TimedValue;
      if (parsed && typeof parsed === 'object' && 'value' in parsed) {
        if (parsed.exp && Date.now() > parsed.exp) {
          localStorage.removeItem(key);
          return null;
        }
        return parsed.value == null ? null : String(parsed.value);
      }
    } catch {
      // plain string from older track.js fallback
    }
    return raw;
  } catch {
    return null;
  }
}

function writeOurRef(hash: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: TimedValue = { value: hash, exp: Date.now() + YOURICH_REF_TTL_MS };
    localStorage.setItem(LS_OUR_REF, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function readFirstCampaignHash(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_FIRST_CAMPAIGN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      refLinkHash?: string | null;
      exp?: number;
    };
    if (parsed?.exp && Date.now() > parsed.exp) {
      localStorage.removeItem(LS_FIRST_CAMPAIGN);
      return null;
    }
    const h = parsed?.refLinkHash?.trim();
    return h || null;
  } catch {
    return null;
  }
}

function clip(s: string): string {
  return s.trim().slice(0, MAX_LEN);
}

/** Read ?yr= / #...?yr= from a location search+hash pair. */
export function parseYrParam(search: string, hash = ''): string | null {
  try {
    const fromSearch = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      .get('yr')
      ?.trim();
    if (fromSearch) return clip(fromSearch);
    const qi = hash.indexOf('?');
    if (qi === -1) return null;
    const fromHash = new URLSearchParams(hash.slice(qi + 1)).get('yr')?.trim();
    return fromHash ? clip(fromHash) : null;
  } catch {
    return null;
  }
}

/** Persist ?yr= ASAP (before SPA navigation / before tracker init). */
export function captureYrFromUrl(search?: string, hash?: string): string | null {
  if (typeof window === 'undefined') return null;
  const yr = parseYrParam(
    search ?? window.location.search,
    hash ?? window.location.hash,
  );
  if (!yr) return null;
  writeOurRef(yr);
  return yr;
}

/**
 * Attribution for createOrder.affiliate.
 * Priority for hash: cookie → track.js LS fallback → our ?yr= store → first-touch campaign.
 */
export function getYourichAffiliate(): YourichAffiliate | null {
  if (typeof window === 'undefined') return null;
  captureYrFromUrl();

  const refHash =
    readCookie(COOKIE_REF_HASH) ||
    readTimedLocalStorage(`yr_fallback_${COOKIE_REF_HASH}`) ||
    readTimedLocalStorage(LS_OUR_REF) ||
    readFirstCampaignHash();

  const extUserId =
    readCookie(COOKIE_UID) || readTimedLocalStorage(`yr_fallback_${COOKIE_UID}`);

  const out: YourichAffiliate = {};
  if (refHash) out.refHash = clip(refHash);
  if (extUserId) out.extUserId = clip(extUserId);
  return out.refHash || out.extUserId ? out : null;
}
