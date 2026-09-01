import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getSingleProduct } from '@/graphql/queries/products.service';
import { productSliceState, GetProductInput, ProductSliceItem } from '@/types/productSlice';
import { ProductDetailNode } from '@/graphql/types/core.types';
import { isVariantOutOfStock } from '@/utils/stock';

const initialState: productSliceState = {
  loading: false,
  notFound: false,
  requestedSlug: null,
  error: null,
  item: null,
  activeVariantId: null,
};

function mapDetailToItem(p: ProductDetailNode): ProductSliceItem {
  return {
    id: String(p.id),
    name: p.name,
    description: p.description,
    pageShortDescriptionHtml: p.pageShortDescriptionHtml || '',
    actionEffectHtml: p.actionEffectHtml || '',
    applicationHtml: p.applicationHtml || '',
    compositionHtml: p.compositionHtml || '',
    importantNoteHtml: p.importantNoteHtml || '',
    mirafloresNoteHtml: p.mirafloresNoteHtml || '',
    storageHtml: p.storageHtml || '',
    purpose: p.purpose || '',
    shelfLife: p.shelfLife || '',
    productTypeName: p.productType?.name || '',
    catalogTags: p.catalogTags ?? [],
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          slug: (p.category as { slug?: string }).slug,
        }
      : null,
    slug: p.slug,
    metaTitle: p.metaTitle ?? null,
    metaDescription: p.metaDescription ?? null,
    ogImageUrl: p.ogImageUrl ?? null,
    canonicalPath: p.canonicalPath ?? null,
    seoNoIndex: p.seoNoIndex ?? false,
    media: p.media,
    thumbnail: p.thumbnail?.url || '',
    variants: p.productVariants.edges,
    attributes: p.attributes,
  };
}

function isSampleVariantName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return false;
  return n === 'пробник' || n.includes('пробник');
}

function variantUnitPrice(
  edge: ProductDetailNode['productVariants']['edges'][number],
): number {
  const amount = edge.node.pricing?.price?.gross?.amount;
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
}

function pickDefaultVariantId(
  edges: ProductDetailNode['productVariants']['edges'],
): string | null {
  if (!edges.length) return null;

  const rank = (edge: (typeof edges)[number]) => {
    const price = variantUnitPrice(edge);
    const sample = isSampleVariantName(edge.node.name);
    const oos = isVariantOutOfStock({
      trackInventory: edge.node.trackInventory,
      quantityAvailable: edge.node.quantityAvailable,
    });
    // ниже = лучше: продаваемый в наличии → продаваемый → в наличии без пробника → остальное
    if (!sample && price > 0 && !oos) return 0;
    if (!sample && price > 0) return 1;
    if (!sample && !oos) return 2;
    if (!oos) return 3;
    return 4;
  };

  let best = edges[0]!;
  let bestRank = rank(best);
  for (let i = 1; i < edges.length; i++) {
    const edge = edges[i]!;
    const r = rank(edge);
    if (r < bestRank) {
      best = edge;
      bestRank = r;
    }
  }
  return best.node.id ?? null;
}

export const getProductBySlug = createAsyncThunk<ProductDetailNode | null, GetProductInput>(
  'product/getProductInfoBySlug',
  async ({ slug }) => {
    const trimmed = slug?.trim() || '';
    if (!trimmed) return null;
    return getSingleProduct(trimmed);
  },
);

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setActiveVariantId(state, action: PayloadAction<string>) {
      state.activeVariantId = action.payload;
    },
    clearProduct(state) {
      state.item = null;
      state.activeVariantId = null;
      state.notFound = false;
      state.error = null;
      state.requestedSlug = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProductBySlug.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.notFound = false;
        state.requestedSlug = action.meta.arg.slug?.trim() || null;
        // Сразу сбрасываем, чтобы не показывать предыдущий/placeholder товар
        state.item = null;
        state.activeVariantId = null;
      })
      .addCase(getProductBySlug.fulfilled, (state, action) => {
        const slug = action.meta.arg.slug?.trim() || '';
        if (state.requestedSlug && slug !== state.requestedSlug) {
          return;
        }
        state.loading = false;
        state.error = null;
        if (action.payload === null) {
          state.item = null;
          state.activeVariantId = null;
          state.notFound = true;
          return;
        }
        state.notFound = false;
        state.item = mapDetailToItem(action.payload);
        state.activeVariantId = pickDefaultVariantId(action.payload.productVariants.edges);
      })
      .addCase(getProductBySlug.rejected, (state, action) => {
        const slug = action.meta.arg.slug?.trim() || '';
        if (state.requestedSlug && slug !== state.requestedSlug) {
          return;
        }
        state.loading = false;
        state.error = action.error;
        state.item = null;
        state.activeVariantId = null;
        state.notFound = true;
      });
  },
});

export const { setActiveVariantId, clearProduct } = productSlice.actions;
export default productSlice.reducer;
