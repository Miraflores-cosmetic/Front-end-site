import { apiFetch } from '@/api/apiClient';

export type ReferralQuarantineMode =
  | 'DELIVERED'
  | 'DAYS_AFTER_PAID'
  | 'DELIVERED_PLUS_DAYS';

export type ReferralDashboard = {
  enabled: boolean;
  code: string | null;
  codeActive: boolean;
  linkPath: string | null;
  shareTextTemplate: string;
  available: number;
  pending: number;
  spendCapPercent: number;
  linkTtlDays: number;
  earnPercent: number;
  quarantineMode: ReferralQuarantineMode;
  quarantineDays: number;
  inviteeBonusEnabled: boolean;
  inviteeBonusRub: number;
  friendsInvited: number;
  friendsWithEarn: number;
};

export type ReferralPublicSettings = {
  linkTtlDays: number;
  enabled?: boolean;
  inviteeBonusEnabled?: boolean;
  inviteeBonusRub?: number;
  earnPercent?: number;
  quarantineMode?: ReferralQuarantineMode;
  quarantineDays?: number;
};

export type ReferralLedgerFilter = 'all' | 'pending' | 'spend';

export type ReferralLedgerKind =
  | 'EARN'
  | 'SPEND_HOLD'
  | 'SPEND_CAPTURE'
  | 'SPEND_RELEASE'
  | 'CLAWBACK'
  | 'ADJUST'
  | 'INVITEE_BONUS'
  | 'DEBT';

export type ReferralLedgerStatus = 'PENDING' | 'POSTED' | 'VOIDED';

export type ReferralLedgerItem = {
  id: string;
  createdAt: string;
  kind: ReferralLedgerKind;
  status: ReferralLedgerStatus;
  amount: number;
  orderNumber: string | null;
};

export async function fetchReferralDashboard(): Promise<ReferralDashboard> {
  return apiFetch<ReferralDashboard>('/account/me/referral');
}

/** Public boot: TTL + invitee banner knobs. */
export async function fetchReferralPublicSettings(): Promise<ReferralPublicSettings> {
  return apiFetch('/settings/referral');
}

/** YYYY-MM-DD в Europe/Moscow — паритет с ReferralMfVisitDaily.day. */
function moscowVisitDay(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Один ключ: { day, codes } — без роста localStorage по кодам×дням. */
const MF_VISIT_LS_KEY = 'miraflores.mf.visit.v2';
const MF_VISIT_LEGACY_PREFIX = 'miraflores.mf.visit.';

type MfVisitDayMap = { day: string; codes: Record<string, 1> };

function readMfVisitMap(): MfVisitDayMap {
  try {
    const raw = localStorage.getItem(MF_VISIT_LS_KEY);
    if (!raw) return { day: '', codes: {} };
    const parsed = JSON.parse(raw) as { day?: unknown; codes?: unknown };
    if (
      typeof parsed?.day === 'string' &&
      parsed.codes &&
      typeof parsed.codes === 'object' &&
      !Array.isArray(parsed.codes)
    ) {
      return { day: parsed.day, codes: parsed.codes as Record<string, 1> };
    }
  } catch {
    /* ignore */
  }
  return { day: '', codes: {} };
}

/** Снести legacy `miraflores.mf.visit.CODE.YYYY-MM-DD`. */
function pruneLegacyMfVisitKeys(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || k === MF_VISIT_LS_KEY) continue;
      if (k.startsWith(MF_VISIT_LEGACY_PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/**
 * Beacon клика ?mf= (агрегат день×код). Fire-and-forget; ошибки глотаем.
 * Dedupe: один LS-ключ на день + sessionStorage (StrictMode).
 */
export function postMfVisit(code: string): void {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,16}$/.test(c)) return;
  if (typeof window !== 'undefined') {
    const day = moscowVisitDay();
    const sessionKey = `miraflores.mf.visit.sent.${c}`;
    try {
      let map = readMfVisitMap();
      if (map.day !== day) {
        map = { day, codes: {} };
      }
      if (map.codes[c] || sessionStorage.getItem(sessionKey)) {
        return;
      }
      map.codes[c] = 1;
      localStorage.setItem(MF_VISIT_LS_KEY, JSON.stringify(map));
      sessionStorage.setItem(sessionKey, '1');
      pruneLegacyMfVisitKeys();
    } catch {
      // private mode — всё равно шлём
    }
  }
  const body = JSON.stringify({ code: c });
  const base =
    ((import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api/v1').replace(
      /\/+$/,
      '',
    );
  const url = `${base}/settings/referral/visit`;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {
    /* ignore */
  });
}

export async function ensureReferralCode(): Promise<{
  code: string;
  active: boolean;
  created: boolean;
  linkPath: string;
}> {
  return apiFetch('/account/me/referral', { method: 'POST' });
}

/** Sticky bind after login when LS still has ?mf=. */
export async function bindReferralCode(code: string): Promise<{
  bound: boolean;
  referrerUserId: string | null;
}> {
  return apiFetch('/account/me/referral/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

export async function fetchReferralLedger(opts?: {
  limit?: number;
  cursor?: string | null;
  filter?: ReferralLedgerFilter | null;
}): Promise<{ items: ReferralLedgerItem[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.cursor) q.set('cursor', opts.cursor);
  if (opts?.filter && opts.filter !== 'all') q.set('filter', opts.filter);
  const qs = q.toString();
  return apiFetch(`/account/me/referral/ledger${qs ? `?${qs}` : ''}`);
}

export function quarantineHint(
  mode: ReferralQuarantineMode | undefined,
  days: number | undefined,
): string {
  const n = Math.max(1, Math.floor(days || 7));
  switch (mode) {
    case 'DAYS_AFTER_PAID':
      return `«Ожидает» станет «Доступно» через ${n} дн. после оплаты заказа друга.`;
    case 'DELIVERED_PLUS_DAYS':
      return `«Ожидает» станет «Доступно» через ${n} дн. после доставки заказа друга.`;
    case 'DELIVERED':
    default:
      return '«Ожидает» станет «Доступно», когда заказ друга получит статус «Доставлен».';
  }
}
