/**
 * Внутренняя рефка Miraflores (?mf=CODE) — отдельно от YouRich (?yr=).
 * TTL по умолчанию 60д (совпадает с seed ReferralSettings.linkTtlDays);
 * фактический TTL для новых кликов можно сузить позже из config API.
 */

export type MirafloresReferral = {
  code: string;
};

const LS_KEY = 'miraflores.mf.ref.v1';
/** Default TTL — как Yourich / admin seed. */
export const MF_REF_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const MAX_LEN = 16;
const CODE_RE = /^[A-Z0-9]{3,16}$/;

type TimedValue = { value: string; exp: number };

function clipCode(raw: string): string | null {
  const c = raw.trim().toUpperCase().slice(0, MAX_LEN);
  return CODE_RE.test(c) ? c : null;
}

function writeCode(code: string, ttlMs = MF_REF_TTL_MS): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: TimedValue = { value: code, exp: Date.now() + ttlMs };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function readCode(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimedValue;
    if (!parsed?.value) return null;
    if (parsed.exp && Date.now() > parsed.exp) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return clipCode(String(parsed.value));
  } catch {
    return null;
  }
}

/** Read ?mf= / #...?mf= only (no bare ?ref= — collision with third-party aliases). */
export function parseMfParam(search: string, hash = ''): string | null {
  try {
    const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const fromSearch = clipCode(sp.get('mf') || '');
    if (fromSearch) return fromSearch;
    const qi = hash.indexOf('?');
    if (qi === -1) return null;
    const hp = new URLSearchParams(hash.slice(qi + 1));
    return clipCode(hp.get('mf') || '');
  } catch {
    return null;
  }
}

/** Persist ?mf= ASAP (before SPA navigation). */
export function captureMfFromUrl(search?: string, hash?: string): string | null {
  if (typeof window === 'undefined') return null;
  const code = parseMfParam(
    search ?? window.location.search,
    hash ?? window.location.hash,
  );
  if (!code) return null;
  writeCode(code);
  return code;
}

/** Attribution for createOrder.referral. */
export function getMirafloresReferral(): MirafloresReferral | null {
  if (typeof window === 'undefined') return null;
  captureMfFromUrl();
  const code = readCode();
  return code ? { code } : null;
}
