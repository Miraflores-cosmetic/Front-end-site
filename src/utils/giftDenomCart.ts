import type { GiftDenomination } from '@/api/giftCertificatesApi';
import type { BestSellersProduct, ProductVariant } from '@/types/products';

/** Guest-cart variantId для номинала — должен совпадать с backend GIFT_DENOM_CART_PREFIX. */
export const GIFT_DENOM_CART_PREFIX = 'gift-denom:';

export function giftDenomVariantId(denominationId: string): string {
  return `${GIFT_DENOM_CART_PREFIX}${denominationId}`;
}

export function parseGiftDenomVariantId(
  variantId: string | null | undefined,
): string | null {
  const raw = (variantId ?? '').trim();
  if (!raw.startsWith(GIFT_DENOM_CART_PREFIX)) return null;
  const id = raw.slice(GIFT_DENOM_CART_PREFIX.length).trim();
  return id || null;
}

export function isGiftDenomVariantId(variantId: string | null | undefined): boolean {
  return Boolean(parseGiftDenomVariantId(variantId));
}

export function mapGiftDenomToBestSellerProduct(
  denom: GiftDenomination,
): BestSellersProduct {
  const variantId = giftDenomVariantId(denom.id);
  const images = [...(denom.images ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => img.url)
    .filter(Boolean);
  const thumbnail = images[0] || '';
  const validityLabel =
    denom.validityDays != null ? `${denom.validityDays} дн.` : 'без срока';

  const productVariant = {
    node: {
      id: variantId,
      sku: `GIFT_CERTIFICATE:${denom.id}`,
      name: denom.name,
      quantityLimitPerCustomer: 10,
      quantityAvailable: 10,
      trackInventory: false,
      pricing: {
        discount: { net: { amount: 0, currency: 'RUB' } },
        price: { gross: { amount: denom.faceValue, currency: 'RUB' } },
        priceUndiscounted: {
          gross: { amount: denom.faceValue, currency: 'RUB' },
        },
      },
    },
  } as ProductVariant;

  return {
    id: variantId,
    productId: denom.id,
    size: validityLabel,
    title: `Подарочный сертификат «${denom.name}»`,
    description: `Электронный сертификат на ${denom.faceValue.toLocaleString('ru-RU')} ₽`,
    slug: 'gift-certificates',
    price: denom.faceValue,
    images,
    thumbnail,
    productVariants: [productVariant],
    quantityLimitPerCustomer: 10,
    quantityAvailable: 10,
    trackInventory: false,
    collections: { id: '', name: '', slug: '' },
    productType: { name: 'ПОДАРОЧНЫЕ СЕРТИФИКАТЫ' },
  };
}


export function lineIsGiftDenom(line: {
  isGiftDenom?: boolean;
  variantId?: string | null;
}): boolean {
  return Boolean(line.isGiftDenom) || isGiftDenomVariantId(line.variantId);
}

/** Физический товар (не благодарность, не digital gift-denom). */
export function lineIsPhysicalCatalog(line: {
  isGift?: boolean;
  isGiftDenom?: boolean;
  variantId?: string | null;
}): boolean {
  if (line.isGift) return false;
  return !lineIsGiftDenom(line);
}

export function isGiftDenomOnlyCart(
  lines: Array<{ isGift?: boolean; isGiftDenom?: boolean; variantId?: string | null }>,
): boolean {
  const payable = lines.filter((l) => !l.isGift);
  return payable.length > 0 && payable.every(lineIsGiftDenom);
}

export function cartWouldMixGiftAndPhysical(
  existing: Array<{ isGift?: boolean; isGiftDenom?: boolean; variantId?: string | null }>,
  adding: { isGift?: boolean; isGiftDenom?: boolean; variantId?: string | null },
): boolean {
  if (adding.isGift) return false;
  const addGift = lineIsGiftDenom(adding);
  const addPhysical = !addGift;
  let hasGift = false;
  let hasPhysical = false;
  for (const line of existing) {
    if (line.isGift) continue;
    if (lineIsGiftDenom(line)) hasGift = true;
    else hasPhysical = true;
  }
  if (addGift && hasPhysical) return true;
  if (addPhysical && hasGift) return true;
  return false;
}
