import { extractProductCardDescription } from '@/utils/productCardDescription';
import { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';
import type { BestSellersProduct } from '@/types/products';

/** Маппинг узла Saleor Product → карточка каталога. */
export function mapProductNodeToBestSeller(productNode: any): BestSellersProduct {
  let variant = productNode.defaultVariant;
  if (!variant && productNode.productVariants) {
    if (Array.isArray(productNode.productVariants)) {
      variant = productNode.productVariants[0]?.node || productNode.productVariants[0];
    } else if (productNode.productVariants.edges) {
      variant = productNode.productVariants.edges[0]?.node;
    }
  }
  const variantId = variant?.id || productNode.id;
  const variantName = getVolumeFromVariant(variant) || variant?.name || '';
  const variantPrice = variant?.pricing?.price?.gross?.amount || 0;
  const variantUndiscountedPrice = variant?.pricing?.priceUndiscounted?.gross?.amount;
  let oldPrice: number | undefined;
  if (variantUndiscountedPrice && variantUndiscountedPrice > variantPrice && variantPrice > 0) {
    oldPrice = variantUndiscountedPrice;
  }
  let discountPercent: number | undefined;
  if (oldPrice && oldPrice > 0 && variantPrice > 0) {
    discountPercent = Math.round(((oldPrice - variantPrice) / oldPrice) * 100);
    if (discountPercent <= 0) {
      discountPercent = undefined;
      oldPrice = undefined;
    }
  }
  let description = extractProductCardDescription(productNode, { preserveHtml: true });
  let productVariants: any[] = [];
  if (Array.isArray(productNode.productVariants)) {
    productVariants = productNode.productVariants;
  } else if (productNode.productVariants?.edges) {
    productVariants = productNode.productVariants.edges;
  }
  const productVariantsFormatted = productVariants.map((v: any) => {
    const variantNode = v.node || v;
    const vName = getVolumeFromVariant(variantNode) || variantNode?.name || '';
    return { node: { ...variantNode, name: vName } };
  });
  const qlimit =
    (variant as { quantityLimitPerCustomer?: number | null } | undefined)?.quantityLimitPerCustomer ??
    null;

  return {
    id: variantId,
    productId: productNode.id,
    size: variantName,
    title: productNode.name || '',
    description,
    price: variantPrice,
    oldPrice,
    discount: discountPercent,
    images: productNode.media?.map((item: any) => item.url) || [],
    thumbnail: productNode.thumbnail?.url || '',
    slug: productNode.slug || '',
    attributes: productNode.attributes || [],
    productType: (() => {
      const pt = productNode.productType;
      if (!pt) return undefined;
      const name = (typeof pt === 'string' ? pt : pt.name || '').trim();
      return name ? { name } : undefined;
    })(),
    productVariants: productVariantsFormatted,
    quantityLimitPerCustomer: qlimit,
    quantityAvailable: variant?.quantityAvailable ?? null,
    trackInventory: variant?.trackInventory ?? null,
    collections: productNode.collections || [],
  };
}
