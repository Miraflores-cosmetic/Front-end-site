import { apiFetch, apiJson, uploadsUrl } from '@/api/apiClient';
import type { AddressInfo } from '@/types/auth';
import type { OrdersData, OrderNode } from '@/graphql/types/core.types';

type JcosAddress = {
  id: string;
  recipientName: string | null;
  phone: string | null;
  city: string;
  address: string;
  apartment: string | null;
  region: string | null;
  district: string | null;
  postalCode: string | null;
  comment: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type JcosOrderItem = {
  id: string;
  title: string;
  sku: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  isGift?: boolean;
  imageUrl: string | null;
  variantName: string | null;
  shadeName: string | null;
  productId?: string | null;
  productSlug?: string | null;
  variantId?: string | null;
};

type JcosOrderSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: string;
  items: JcosOrderItem[];
  tracking: string | null;
  trackingProvider: string | null;
};

export function mapJcosAddressToInfo(a: JcosAddress): AddressInfo {
  const parts = (a.recipientName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    id: a.id,
    firstName,
    lastName,
    phone: a.phone || '',
    city: a.city,
    streetAddress1: a.address,
    streetAddress2: a.comment || '',
    postalCode: a.postalCode || '',
    apartment: a.apartment || '',
    cityArea: a.district || '',
    countryArea: a.region || '',
    isDefaultBillingAddress: a.isDefault,
    isDefaultShippingAddress: a.isDefault,
    metadata: [],
    country: { code: 'RU', country: 'Russia' },
  };
}

export function mapInfoToJcosAddress(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  postalCode?: string;
  apartment?: string;
  countryArea?: string;
  cityArea?: string;
}): {
  recipientName?: string;
  phone?: string;
  city: string;
  address: string;
  apartment?: string;
  region?: string;
  district?: string;
  postalCode?: string;
  comment?: string;
} {
  const recipientName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim() || undefined;
  return {
    recipientName,
    phone: input.phone,
    city: input.city || '',
    address: input.streetAddress1 || '',
    apartment: input.apartment || undefined,
    region: input.countryArea || undefined,
    district: input.cityArea || undefined,
    postalCode: input.postalCode,
    comment: input.streetAddress2,
  };
}

async function listAddressesRaw(): Promise<JcosAddress[]> {
  const res = await apiFetch<JcosAddress[] | { items?: JcosAddress[] }>('/account/addresses');
  return Array.isArray(res) ? res : (res.items ?? []);
}

export async function listAddresses(): Promise<AddressInfo[]> {
  const rows = await listAddressesRaw();
  return rows.map(mapJcosAddressToInfo);
}

export async function createAddress(
  input: Parameters<typeof mapInfoToJcosAddress>[0],
  isDefault = false,
): Promise<AddressInfo[]> {
  await apiJson('/account/addresses', 'POST', {
    ...mapInfoToJcosAddress(input),
    isDefault,
  });
  return listAddresses();
}

export async function updateAddress(
  id: string,
  input: Parameters<typeof mapInfoToJcosAddress>[0],
): Promise<AddressInfo[]> {
  await apiJson(`/account/addresses/${encodeURIComponent(id)}`, 'PATCH', mapInfoToJcosAddress(input));
  return listAddresses();
}

export async function deleteAddress(id: string): Promise<AddressInfo[]> {
  await apiJson(`/account/addresses/${encodeURIComponent(id)}`, 'DELETE');
  return listAddresses();
}

export async function setDefaultAddress(id: string): Promise<AddressInfo[]> {
  await apiJson(`/account/addresses/${encodeURIComponent(id)}/default`, 'POST');
  return listAddresses();
}

function mapOrderStatus(status: string): OrderNode['status'] {
  const s = status.toUpperCase();
  if (s.includes('CANCEL')) return 'CANCELED';
  if (s.includes('FULFIL') && !s.includes('UN')) return 'FULFILLED';
  if (s.includes('PARTIAL')) return 'PARTIALLY_FULFILLED';
  return 'UNFULFILLED';
}

function mapOrderToNode(o: JcosOrderSummary): OrderNode {
  return {
    id: o.id,
    number: o.number,
    created: o.createdAt,
    status: mapOrderStatus(o.status),
    statusDisplay: o.status,
    isPaid: !['AWAITING_PAYMENT', 'DRAFT', 'CANCELLED'].includes(o.status.toUpperCase()),
    total: { gross: { amount: o.total, currency: 'RUB' } },
    userEmail: '',
    tracking: o.tracking,
    trackingProvider: o.trackingProvider,
    lines: o.items.map((item) => ({
      id: item.id,
      productName: item.title,
      quantity: item.qty,
      variantName: item.variantName || item.shadeName || undefined,
      unitPrice: { gross: { amount: item.unitPrice, currency: 'RUB' } },
      isGift: Boolean(item.isGift),
      thumbnail: item.imageUrl ? { url: uploadsUrl(item.imageUrl) || item.imageUrl } : undefined,
      variant: {
        id: item.variantId || undefined,
        product: {
          id: item.productId || undefined,
          slug: item.productSlug || undefined,
          thumbnail: item.imageUrl ? { url: uploadsUrl(item.imageUrl) || item.imageUrl } : undefined,
        },
      },
    })),
  };
}

export async function listOrders(): Promise<OrdersData['orders']> {
  const rows = await apiFetch<JcosOrderSummary[]>('/account/orders');
  return {
    edges: (rows ?? []).map((o) => ({ node: mapOrderToNode(o) })),
    pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null },
  };
}

export async function getOrder(id: string): Promise<OrderNode | null> {
  try {
    const o = await apiFetch<JcosOrderSummary & { email?: string; phone?: string }>(
      `/account/orders/${encodeURIComponent(id)}`,
    );
    const node = mapOrderToNode(o);
    if (o.email) node.userEmail = o.email;
    return node;
  } catch {
    return null;
  }
}

// ——— Favorites ———

export async function fetchFavoriteIds(): Promise<string[]> {
  const res = await apiFetch<string[] | { variantIds?: string[] }>('/account/favorites');
  if (Array.isArray(res)) return res;
  return res.variantIds ?? [];
}

export async function replaceFavorites(variantIds: string[]): Promise<void> {
  await apiJson('/account/favorites', 'PUT', { variantIds });
}

export async function addFavorite(variantId: string): Promise<void> {
  await apiJson(`/account/favorites/${encodeURIComponent(variantId)}`, 'POST');
}

export async function removeFavorite(variantId: string): Promise<void> {
  await apiJson(`/account/favorites/${encodeURIComponent(variantId)}`, 'DELETE');
}

export async function fetchFavoriteItems(): Promise<
  Array<{
    variantId: string;
    productId: string;
    slug: string;
    name: string;
    price: number;
    listPrice: number | null;
    imageUrl: string | null;
    imageUrls: string[];
    variantName: string | null;
    shortDescription: string | null;
    discountPercent: number | null;
  }>
> {
  const res = await apiFetch<
    | Array<{
        variantId: string;
        productId?: string;
        id?: string;
        slug: string;
        name: string;
        price: number;
        oldPrice?: number | null;
        listPrice?: number | null;
        imageUrl: string | null;
        imageUrls?: string[];
        variantName: string | null;
        shortDescription?: string | null;
        discountPercent?: number | null;
      }>
    | {
        items?: Array<{
          variantId: string;
          productId?: string;
          id?: string;
          slug: string;
          name: string;
          price: number;
          oldPrice?: number | null;
          listPrice?: number | null;
          imageUrl: string | null;
          imageUrls?: string[];
          variantName: string | null;
          shortDescription?: string | null;
          discountPercent?: number | null;
        }>;
      }
  >('/account/favorites/items');
  const rows = Array.isArray(res) ? res : (res.items ?? []);
  return rows.map(r => ({
    variantId: r.variantId,
    productId: r.productId || r.id || '',
    slug: r.slug,
    name: r.name,
    price: r.price,
    listPrice: r.listPrice ?? r.oldPrice ?? null,
    imageUrl: r.imageUrl ? uploadsUrl(r.imageUrl) || r.imageUrl : null,
    imageUrls: (r.imageUrls ?? [])
      .map(url => (url ? uploadsUrl(url) || url : ''))
      .filter(Boolean),
    variantName: r.variantName,
    shortDescription: r.shortDescription ?? null,
    discountPercent: r.discountPercent ?? null,
  }));
}
