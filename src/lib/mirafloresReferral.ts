/**
 * Внутренняя рефка Miraflores (?mf=CODE) — отдельно от YouRich (?yr=).
 * Клиент: attribution в localStorage (не cookie). TTL из admin `linkTtlDays`.
 * Сервер дополнительно держит sticky `User.referredByUserId` (регистрация /
 * первый заказ / bind) и подставляет код в createOrder в пределах того же TTL.
 */

export type MirafloresReferral = {
  code: string;
};

const LS_KEY = 'miraflores.mf.ref.v1';
const TTL_DAYS_LS_KEY = 'miraflores.mf.ttlDays.v1';
/** Default TTL — как admin seed ReferralSettings.linkTtlDays. */
export const MF_REF_DEFAULT_TTL_DAYS = 60;
export const MF_REF_TTL_MS = MF_REF_DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_LEN = 16;
const CODE_RE = /^[A-Z0-9]{3,16}$/;

type TimedValue = { value: string; exp: number };

let cachedTtlMs = MF_REF_TTL_MS;

function clampTtlDays(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return MF_REF_DEFAULT_TTL_DAYS;
  return Math.min(3650, Math.max(1, n));
}

function readCachedTtlDays(): number | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TTL_DAYS_LS_KEY);
    if (!raw) return null;
    return clampTtlDays(raw);
  } catch {
    return null;
  }
}

/** Hydrate TTL from last known admin value (before network). */
function bootTtlFromCache(): void {
  const days = readCachedTtlDays();
  if (days != null) cachedTtlMs = days * 24 * 60 * 60 * 1000;
}
bootTtlFromCache();

/** Apply admin `linkTtlDays` for subsequent captureMfFromUrl writes. */
export function setMfRefTtlDays(days: unknown): number {
  const d = clampTtlDays(days);
  cachedTtlMs = d * 24 * 60 * 60 * 1000;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TTL_DAYS_LS_KEY, String(d));
    } catch {
      // ignore
    }
  }
  return d;
}

export function getMfRefTtlMs(): number {
  return cachedTtlMs;
}

/**
 * Переписать exp уже сохранённого ?mf= под текущий cachedTtlMs.
 * Нужно после fetch linkTtlDays: captureMfFromUrl() на boot часто раньше настроек.
 */
export function rewriteMfRefExpiry(ttlMs = cachedTtlMs): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as TimedValue;
    const code = clipCode(String(parsed?.value ?? ''));
    if (!code) return false;
    if (parsed.exp && Date.now() > parsed.exp) {
      localStorage.removeItem(LS_KEY);
      return false;
    }
    writeCode(code, ttlMs);
    return true;
  } catch {
    return false;
  }
}

function clipCode(raw: string): string | null {
  const c = raw.trim().toUpperCase().slice(0, MAX_LEN);
  return CODE_RE.test(c) ? c : null;
}

function writeCode(code: string, ttlMs = cachedTtlMs): void {
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

/** Persist ?mf= ASAP (before SPA navigation). Uses current admin TTL. */
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
