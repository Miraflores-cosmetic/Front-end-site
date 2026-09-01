import { getProductEdges, resolveCollectionSlug } from '@/api/catalogApi';

export interface CollectionProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  attributes?: Array<{
    attribute: { id: string; name: string; slug: string };
    values: Array<{ name?: string; slug?: string; plainText?: string; richText?: any }>;
  }>;
  thumbnail?: { url: string };
  media?: Array<{ url: string }>;
  defaultVariant?: {
    id: string;
    name: string;
    quantityLimitPerCustomer?: number | null;
    trackInventory?: boolean | null;
    quantityAvailable?: number | null;
    pricing: {
      price: { gross: { amount: number } };
      priceUndiscounted?: { gross: { amount: number } };
      discount?: { gross: { amount: number } };
    };
  };
  productVariants?: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        quantityLimitPerCustomer?: number | null;
        trackInventory?: boolean | null;
        quantityAvailable?: number | null;
        pricing: {
          price: { gross: { amount: number } };
          priceUndiscounted?: { gross: { amount: number } };
          discount?: { gross: { amount: number } };
        };
        attributes?: Array<{
          attribute: { id: string; name: string; slug: string };
          values: Array<{ name?: string; slug?: string; plainText?: string }>;
        }>;
      };
    }>;
  };
  collections?: Array<{ id: string; name: string; slug: string }>;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  products: { edges: Array<{ node: CollectionProduct }> };
}

export interface CollectionResponse {
  collection: Collection | null;
}

export async function getCollectionById(id: string, first = 10): Promise<Collection | null> {
  const slug = await resolveCollectionSlug(id);
  if (!slug) return null;
  const { edges } = await getProductEdges({ collection: slug, limit: first, page: 1 });
  if (!edges.length) {
    return { id, name: slug, slug, products: { edges: [] } };
  }
  return {
    id,
    name: slug,
    slug,
    products: { edges: edges.map((e) => ({ node: e.node as unknown as CollectionProduct })) },
  };
}
