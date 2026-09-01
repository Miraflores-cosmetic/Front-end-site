// ------------------------------------
// Checkout Line (Basket Item)
// ------------------------------------
export interface CheckoutLine {
  variantId: string;
  quantity: number;

  title: string;
  price: number;
  slug?: string;

  thumbnail?: string;
  oldPrice?: number | null;
  discount?: number | null;
  size?: string;
  /** Лимит с варианта (дашборд); null — на клиенте не ограничиваем (кроме VITE_MAX_LINE_QUANTITY). */
  quantityLimitPerCustomer?: number | null;
  /** Подарок по программе благодарности — не удаляется из корзины */
  isGift?: boolean;
  /** Запас при добавлении в корзину (для подписи «Нет в наличии» в корзине) */
  quantityAvailable?: number | null;
  trackInventory?: boolean | null;
}

// ------------------------------------
// Checkout State (localStorage + Nest /orders)
// ------------------------------------
/** Persist shape: только lines + voucher. Нет Saleor checkout id/token. */
export interface CheckoutStateInLocalStorage {
  lines: CheckoutLine[];
}

export type VoucherKind = 'promo' | 'gift';

export interface CheckoutState extends CheckoutStateInLocalStorage {
  loading: boolean;
  error: string | null;
  /** Откуда гидрировали корзину */
  source: 'api' | 'localStorage';
  voucherCode: string | null;
  voucherDiscount: number;
  /** promoCode vs giftCertificateCode при createOrder */
  voucherKind: VoucherKind | null;
  /** Email, с которым код валидировали (для revalidate; не в localStorage). */
  voucherEmail: string | null;
  /** true после initializeCart — для empty-redirect на /order */
  hydrated: boolean;
}

// ------------------------------------
// Basket Card Props
// ------------------------------------
export interface BasketCardProps extends CheckoutLine {
  onAdd?: () => void;
  onRemove?: () => void;
}
