import { describe, expect, it } from 'vitest';
import { cardToProductEdge, type JcosProductCard } from './catalogApi';

function baseCard(over: Partial<JcosProductCard> = {}): JcosProductCard {
  return {
    id: 'p1',
    variantId: 'v50',
    variantName: '50 мл',
    shadeId: null,
    shadeName: null,
    slug: 'cream',
    name: 'Крем',
    shortDescription: null,
    price: 1000,
    oldPrice: null,
    discountPercent: null,
    priceFrom: false,
    available: 5,
    minQty: 1,
    maxQty: 5,
    imageUrl: null,
    imageUrls: [],
    mediaType: 'image',
    ...over,
  };
}

describe('cardToProductEdge variants[]', () => {
  it('maps all card.variants into productVariants', () => {
    const edge = cardToProductEdge(
      baseCard({
        priceFrom: true,
        variants: [
          {
            id: 'v50',
            name: '50 мл',
            price: 1000,
            oldPrice: null,
            available: 5,
            minQty: 1,
            maxQty: 5,
          },
          {
            id: 'v100',
            name: '100 мл',
            price: 1800,
            oldPrice: 2000,
            available: 3,
            minQty: 2,
            maxQty: 3,
          },
        ],
      }),
    );
    const variants = edge.node.productVariants as Array<{ node: { id: string; orderMinQty?: number } }>;
    expect(variants).toHaveLength(2);
    expect(variants.map((v) => v.node.id)).toEqual(['v50', 'v100']);
    expect(variants[1]!.node.orderMinQty).toBe(2);
  });

  it('falls back to single default when variants[] missing', () => {
    const edge = cardToProductEdge(baseCard({ variants: undefined }));
    const variants = edge.node.productVariants as Array<{ node: { id: string } }>;
    expect(variants).toHaveLength(1);
    expect(variants[0]!.node.id).toBe('v50');
  });
});
