import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchProductContentBySlug } from '@/api/catalogApi';
import { getSingleProduct } from '@/graphql/queries/products.service';
import {
  productSliceState,
  GetProductInput,
  ProductSliceItem,
  type ProductContentPayload,
} from '@/types/productSlice';
import { ProductDetailNode } from '@/graphql/types/core.types';
import { isVariantOutOfStock } from '@/utils/stock';

const initialState: productSliceState = {
  loading: false,
  notFound: false,
  requestedSlug: null,
  pendingContent: null,
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

function applyContentToItem(
  item: ProductSliceItem,
  payload: ProductContentPayload,
): ProductSliceItem {
  return {
    ...item,
    description: payload.descriptionHtml || item.description,
    actionEffectHtml: payload.actionEffectHtml || '',
    applicationHtml: payload.applicationHtml || '',
    compositionHtml: payload.compositionHtml || '',
    importantNoteHtml: payload.importantNoteHtml || '',
    mirafloresNoteHtml: payload.mirafloresNoteHtml || '',
    storageHtml: payload.storageHtml || item.storageHtml,
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

/** Tab HTML — после hero (GET …/products/:slug/content). */
export const hydrateProductContent = createAsyncThunk<
  Awaited<ReturnType<typeof fetchProductContentBySlug>>,
  string
>('product/hydrateContent', async (slug) => {
  const trimmed = slug?.trim() || '';
  if (!trimmed) return null;
  return fetchProductContentBySlug(trimmed);
});

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
      state.pendingContent = null;
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
        state.pendingContent = null;
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
          state.pendingContent = null;
          return;
        }
        state.notFound = false;
        let item = mapDetailToItem(action.payload);
        if (state.pendingContent) {
          item = applyContentToItem(item, state.pendingContent);
          state.pendingContent = null;
        }
        state.item = item;
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
        state.pendingContent = null;
      })
      .addCase(hydrateProductContent.fulfilled, (state, action) => {
        const slug = (action.meta.arg || '').trim();
        if (state.requestedSlug && slug && slug !== state.requestedSlug) {
          return;
        }
        const payload = action.payload;
        if (!payload) return;
        if (!state.item) {
          // Content быстрее hero — применим в getProductBySlug.fulfilled
          state.pendingContent = payload;
          return;
        }
        state.item = applyContentToItem(state.item, payload);
        state.pendingContent = null;
      });
  },
});

export const { setActiveVariantId, clearProduct } = productSlice.actions;
export default productSlice.reducer;
