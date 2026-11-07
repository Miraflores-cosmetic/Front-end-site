import { apiFetch } from '@/api/apiClient';

export type ReferralDashboard = {
  enabled: boolean;
  code: string | null;
  codeActive: boolean;
  linkPath: string | null;
  shareTextTemplate: string;
  available: number;
  pending: number;
  spendCapPercent: number;
  inviteeBonusEnabled: boolean;
  inviteeBonusRub: number;
};

export type ReferralLedgerKind =
  | 'EARN'
  | 'SPEND_HOLD'
  | 'SPEND_CAPTURE'
  | 'SPEND_RELEASE'
  | 'CLAWBACK'
  | 'ADJUST'
  | 'INVITEE_BONUS';

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

export async function ensureReferralCode(): Promise<{
  code: string;
  active: boolean;
  created: boolean;
  linkPath: string;
}> {
  return apiFetch('/account/me/referral', { method: 'POST' });
}

export async function fetchReferralLedger(opts?: {
  limit?: number;
  cursor?: string | null;
}): Promise<{ items: ReferralLedgerItem[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.cursor) q.set('cursor', opts.cursor);
  const qs = q.toString();
  return apiFetch(`/account/me/referral/ledger${qs ? `?${qs}` : ''}`);
}
