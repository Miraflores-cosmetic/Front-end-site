const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PACKING: 'Собирается',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  CANCELED: 'Отменён',
  REFUNDED: 'Возвращён',
  DRAFT: 'Черновик',
  UNCONFIRMED: 'Не подтверждён',
  UNFULFILLED: 'В обработке',
  PARTIALLY_FULFILLED: 'Частично отгружен',
  FULFILLED: 'Отгружен',
  RETURNED: 'Возвращён',
};

export function normalizeOrderStatus(status?: string): string {
  return String(status || '').toUpperCase().replace(/\s+/g, '_');
}

export function orderStatusLabel(status?: string): string {
  const key = normalizeOrderStatus(status);
  return ORDER_STATUS_LABELS[key] ?? status ?? '—';
}

export type OrderFilterTab = 'all' | 'process' | 'delivered' | 'cancelled' | 'refunded';

const DELIVERED = new Set(['DELIVERED', 'FULFILLED']);
const PROCESS = new Set([
  'NEW',
  'AWAITING_PAYMENT',
  'PAID',
  'PACKING',
  'SHIPPED',
  'UNFULFILLED',
  'PARTIALLY_FULFILLED',
  'UNCONFIRMED',
  'DRAFT',
]);
const CANCELLED = new Set(['CANCELLED', 'CANCELED', 'EXPIRED']);
const REFUNDED = new Set(['REFUNDED', 'RETURNED', 'PARTIALLY_RETURNED']);

export function countOrdersByTab(
  orders: { status?: string; statusDisplay?: string }[],
): Record<OrderFilterTab, number> {
  let process = 0;
  let delivered = 0;
  let cancelled = 0;
  let refunded = 0;

  for (const order of orders) {
    const status = normalizeOrderStatus(order.statusDisplay || order.status);
    if (DELIVERED.has(status)) delivered += 1;
    else if (CANCELLED.has(status)) cancelled += 1;
    else if (REFUNDED.has(status)) refunded += 1;
    else if (PROCESS.has(status)) process += 1;
  }

  return {
    all: orders.length,
    process,
    delivered,
    cancelled,
    refunded,
  };
}

export function orderMatchesTab(status: string | undefined, tab: OrderFilterTab): boolean {
  if (tab === 'all') return true;
  const s = normalizeOrderStatus(status);
  if (tab === 'delivered') return DELIVERED.has(s);
  if (tab === 'cancelled') return CANCELLED.has(s);
  if (tab === 'refunded') return REFUNDED.has(s);
  if (tab === 'process') return PROCESS.has(s);
  return false;
}

export function orderStatusBadgeClass(
  status: string | undefined,
  styles: Record<string, string>,
): string {
  switch (normalizeOrderStatus(status)) {
    case 'PAID':
    case 'DELIVERED':
    case 'FULFILLED':
      return styles.badgeSuccess ?? '';
    case 'PACKING':
      return styles.badgePacking ?? '';
    case 'SHIPPED':
      return styles.badgeShipped ?? '';
    case 'AWAITING_PAYMENT':
    case 'NEW':
    case 'DRAFT':
    case 'UNCONFIRMED':
      return styles.badgeAwaiting ?? '';
    case 'CANCELLED':
    case 'CANCELED':
    case 'EXPIRED':
      return styles.badgeCancelled ?? '';
    case 'REFUNDED':
    case 'RETURNED':
    case 'PARTIALLY_RETURNED':
      return styles.badgeRefunded ?? '';
    default:
      return styles.badgeDefault ?? '';
  }
}
