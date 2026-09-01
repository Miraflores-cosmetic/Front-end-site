import { searchCatalog } from '@/api/cmsApi';
import { uploadsUrl } from '@/api/apiClient';
import type { ProductNode } from '@/types/products';

export async function searchProducts(
  query: string,
  options?: { signal?: AbortSignal },
): Promise<ProductNode[]> {
  try {
    const res = await searchCatalog(query.trim(), options);
    const productGroup = res.groups?.find((g) => g.key === 'product');
    if (!productGroup?.items?.length) return [];

    return productGroup.items.map((hit) => ({
      id: hit.id,
      name: hit.title,
      slug: hit.href.replace(/^\/product\//, '').replace(/^\//, ''),
      thumbnail: { url: uploadsUrl(hit.imageUrl) || hit.imageUrl || '', alt: hit.title },
      defaultVariant: {
        id: hit.id,
        pricing: { price: { gross: { amount: 0 } } },
      },
    })) as ProductNode[];
  } catch {
    return [];
  }
}
