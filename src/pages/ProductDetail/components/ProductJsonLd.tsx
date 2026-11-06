import { useEffect } from 'react';
import { uploadsUrl } from '@/api/apiClient';
import type { ProductSliceItem, ProductVariant } from '@/types/productSlice';

const BRAND = 'Miraflores';

function absoluteUrl(pathOrUrl: string | null | undefined): string | null {
  const u = uploadsUrl(pathOrUrl ?? '');
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${u.startsWith('/') ? u : `/${u}`}`;
  }
  return u;
}

/** Product + Offer JSON-LD (rich results); не меняет визуальный UI. */
export function ProductJsonLd({
  item,
  variants,
}: {
  item: ProductSliceItem;
  variants: ProductVariant[];
}) {
  useEffect(() => {
    const offers = variants
      .map((edge) => {
        const v = edge.node;
        const price = v.pricing?.price?.gross?.amount;
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
          return null;
        }
        const availability =
          v.trackInventory === false
            ? 'https://schema.org/InStock'
            : (v.quantityAvailable ?? 0) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock';
        const offer: Record<string, unknown> = {
          '@type': 'Offer',
          sku: v.sku || undefined,
          price: Math.round(price * 100) / 100,
          priceCurrency: v.pricing?.price?.gross?.currency || 'RUB',
          availability,
          url:
            typeof window !== 'undefined'
              ? `${window.location.origin}/product/${item.slug}`
              : undefined,
        };
        if (v.orderMinQty && v.orderMinQty > 1) {
          offer.eligibleQuantity = { '@type': 'QuantitativeValue', value: v.orderMinQty };
        }
        return offer;
      })
      .filter(Boolean) as Record<string, unknown>[];

    if (!offers.length) return;

    const images = (item.media ?? [])
      .map((m) => absoluteUrl(m.url))
      .filter(Boolean) as string[];

    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: item.name,
      sku: variants[0]?.node?.sku || undefined,
      brand: { '@type': 'Brand', name: BRAND },
      offers: offers.length === 1 ? offers[0] : offers,
    };
    if (images.length) data.image = images;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-product-jsonld', '1');
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      document.head.querySelector('script[data-product-jsonld="1"]')?.remove();
    };
  }, [item.slug, item.name, item.media, variants]);

  return null;
}
