import { graphqlRequest, CHANNEL } from '@/graphql/client';

/** Ключи metadata варианта (блок «Доставка» / произвольные поля в Saleor): габариты в см */
const META_LENGTH_KEYS = ['package_length_cm', 'shipping_length_cm', 'cdek_length_cm', 'length_cm'];
const META_WIDTH_KEYS = ['package_width_cm', 'shipping_width_cm', 'cdek_width_cm', 'width_cm'];
const META_HEIGHT_KEYS = ['package_height_cm', 'shipping_height_cm', 'cdek_height_cm', 'height_cm'];

export interface VariantShippingRow {
    variantId: string;
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
}

interface WeightGql {
    value: number;
    unit: 'G' | 'KG' | 'LB' | 'OZ' | 'TONNE';
}

interface MetaItem {
    key: string;
    value: string;
}

interface VariantNode {
    id: string;
    weight?: WeightGql | null;
    metadata?: MetaItem[];
}

interface ProductVariantsResponse {
    productVariants: {
        edges: Array<{ node: VariantNode | null } | null>;
    };
}

function weightToGrams(w: WeightGql | null | undefined): number {
    if (!w || w.value == null || Number.isNaN(w.value)) return 300;
    const v = w.value;
    const unit = String(w.unit || '').toUpperCase() as WeightGql['unit'];
    switch (unit) {
        case 'G':
            return Math.max(1, Math.round(v));
        case 'KG':
            return Math.max(1, Math.round(v * 1000));
        case 'LB':
            return Math.max(1, Math.round(v * 453.592));
        case 'OZ':
            return Math.max(1, Math.round(v * 28.3495));
        case 'TONNE':
            return Math.max(1, Math.round(v * 1_000_000));
        default:
            return Math.max(1, Math.round(v));
    }
}

function metaNumber(meta: MetaItem[] | undefined, keys: string[]): number {
    if (!meta?.length) return 0;
    const lower = keys.map((k) => k.toLowerCase());
    for (const item of meta) {
        if (!item?.key) continue;
        const k = item.key.toLowerCase();
        if (lower.includes(k)) {
            const n = parseFloat(String(item.value).replace(',', '.'));
            if (!Number.isNaN(n) && n > 0) return n;
        }
    }
    return 0;
}

const QUERY = `
  query VariantsShipping($ids: [ID!]!, $channel: String) {
    productVariants(ids: $ids, first: 100, channel: $channel) {
      edges {
        node {
          id
          weight {
            value
            unit
          }
          metadata {
            key
            value
          }
        }
      }
    }
  }
`;

const DEFAULT_L = 20;
const DEFAULT_W = 15;
const DEFAULT_H = 10;

export async function fetchVariantsShippingData(variantIds: string[]): Promise<Map<string, VariantShippingRow>> {
    const ids = [...new Set(variantIds.filter(Boolean))];
    const map = new Map<string, VariantShippingRow>();
    if (ids.length === 0) return map;

    const data = await graphqlRequest<ProductVariantsResponse>(QUERY, {
        ids,
        channel: CHANNEL,
    });
    const edges = data?.productVariants?.edges || [];

    for (const edge of edges) {
        const node = edge?.node;
        if (!node?.id) continue;
        const meta = node.metadata || [];
        const len = metaNumber(meta, META_LENGTH_KEYS) || DEFAULT_L;
        const wid = metaNumber(meta, META_WIDTH_KEYS) || DEFAULT_W;
        const hgt = metaNumber(meta, META_HEIGHT_KEYS) || DEFAULT_H;
        map.set(node.id, {
            variantId: node.id,
            weightGrams: weightToGrams(node.weight ?? undefined),
            lengthCm: len,
            widthCm: wid,
            heightCm: hgt,
        });
    }

    return map;
}
