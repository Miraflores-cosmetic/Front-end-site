export type BuyerOrderChatTarget =
  | { kind: 'order'; orderId: string }
  | { kind: 'support'; customerUserId: string };

function entityKey(target: BuyerOrderChatTarget): string {
  return target.kind === 'order' ? target.orderId : target.customerUserId;
}

export function buyerChatMessagesPath(target: BuyerOrderChatTarget): string {
  if (target.kind === 'order') {
    return `/account/orders/${encodeURIComponent(target.orderId)}/chat/messages`;
  }
  return '/account/chat/support/messages';
}

export function buyerChatMessagesListPath(
  target: BuyerOrderChatTarget,
  opts?: { limit?: number; before?: string; after?: string },
): string {
  const base = buyerChatMessagesPath(target);
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const before = opts?.before?.trim();
  if (before) params.set('before', before);
  const after = opts?.after?.trim();
  if (after) params.set('after', after);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function buyerChatReadPath(target: BuyerOrderChatTarget): string {
  if (target.kind === 'order') {
    return `/account/orders/${encodeURIComponent(target.orderId)}/chat/read`;
  }
  return '/account/chat/support/read';
}

export function buyerChatUploadPath(target: BuyerOrderChatTarget): string {
  if (target.kind === 'order') {
    return `/account/orders/${encodeURIComponent(target.orderId)}/chat/upload`;
  }
  return '/account/chat/support/upload';
}

export function buyerChatUploadRevokePath(target: BuyerOrderChatTarget): string {
  if (target.kind === 'order') {
    return `/account/orders/${encodeURIComponent(target.orderId)}/chat/upload/revoke`;
  }
  return '/account/chat/support/upload/revoke';
}

export function buyerChatDeletePath(target: BuyerOrderChatTarget, messageId: string): string {
  if (target.kind === 'order') {
    return `/account/orders/${encodeURIComponent(target.orderId)}/chat/messages/${encodeURIComponent(messageId)}`;
  }
  return `/account/chat/support/messages/${encodeURIComponent(messageId)}`;
}

export function buyerChatSocketJoinPayload(target: BuyerOrderChatTarget): Record<string, string> {
  if (target.kind === 'order') return { orderId: target.orderId };
  return { userId: target.customerUserId };
}

export function buyerChatSocketLeavePayload(target: BuyerOrderChatTarget): Record<string, string> {
  return buyerChatSocketJoinPayload(target);
}

export function buyerChatTargetKey(target: BuyerOrderChatTarget): string {
  return `${target.kind}:${entityKey(target)}`;
}
