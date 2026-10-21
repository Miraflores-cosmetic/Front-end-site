import { BestSellersProduct, BestsellerConnection } from '@/types/products';
import { extractProductCardDescription } from '@/utils/productCardDescription';
import { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';
import { createSlice, createAsyncThunk, SerializedError, AsyncThunkConfig } from '@reduxjs/toolkit';
import { getBestsellerProducts } from '@/graphql/queries/products.service';

interface BestSellersState {
  bestSellers: BestSellersProduct[];
  loading: boolean;
  error: SerializedError | null;
  hasAttemptedLoad: boolean; // Флаг, что уже пытались загрузить
}

const initialState: BestSellersState = {
  bestSellers: [],
  loading: false,
  error: null,
  hasAttemptedLoad: false
};

export const getBestSellers = createAsyncThunk<any, void, AsyncThunkConfig>(
  'bestsellers/getBestSellers',
  async () => {
    const result = await getBestsellerProducts();

    return result;
  }
);

const bestsellerSlice = createSlice({
  name: 'bestsellersSlice',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(getBestSellers.pending, state => {
        state.loading = true;
        state.error = null;
        state.hasAttemptedLoad = true; // Отмечаем, что начали загрузку
      })
      .addCase(getBestSellers.fulfilled, (state, action) => {
        const newBestSellers: BestSellersProduct[] = [];
        action.payload.edges.forEach((node: any) => {
          const variant = node.node.defaultVariant || 
            (node.node.productVariants?.edges?.[0]?.node);
          
          const variantId = variant?.id || node.node.id;
          const variantName = getVolumeFromVariant(variant) || variant?.name || '';
          
          const variantPrice = variant?.pricing?.price?.gross?.amount || 0;
          const variantUndiscountedPrice = variant?.pricing?.priceUndiscounted?.gross?.amount;
          const variantDiscountAmount = variant?.pricing?.discount?.gross?.amount;
          
          let oldPrice: number | undefined = undefined;
          if (variantUndiscountedPrice && variantUndiscountedPrice > variantPrice && variantPrice > 0) {
            oldPrice = variantUndiscountedPrice;
          }
          
          let discountPercent: number | undefined = undefined;
          if (oldPrice && oldPrice > 0 && variantPrice > 0) {
            discountPercent = Math.round(((oldPrice - variantPrice) / oldPrice) * 100);
            if (discountPercent <= 0) {
              discountPercent = undefined;
              oldPrice = undefined;
            }
          }
          
          let description = extractProductCardDescription(
            {
              attributes: node.node.attributes,
              shortDescription: node.node.shortDescription,
              description: node.node.description,
            },
            { preserveHtml: true },
          );
          
          newBestSellers.push({
            id: variantId,
            productId: node.node.id,
            size: variantName,
            title: node.node.name || '',
            description,
            price: variantPrice,
            oldPrice: oldPrice,
            discount: discountPercent,
            images: node.node.media?.map((item: any) => item.url) || [],
            thumbnail: node.node.thumbnail?.url || '',
            slug: node.node.slug || '',
            attributes: node.node.attributes || [],
            productType: node.node.productType
              ? { name: node.node.productType.name }
              : undefined,
            productVariants: (node.node.productVariants?.edges || []).map((v: any) => {
              const variantName =
                getVolumeFromVariant(v) || v.node?.name || '';
              return {
                ...v,
                node: {
                  ...v.node,
                  name: variantName,
                },
              };
            }),
            collections: node.node.collections || [],
            quantityAvailable: variant?.quantityAvailable ?? null,
            trackInventory: variant?.trackInventory ?? null
          });
        });
        state.bestSellers = newBestSellers;
        state.loading = false;
        state.error = null;
      })
      .addCase(getBestSellers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
        state.hasAttemptedLoad = true; // Отмечаем, что попытка была
      });
  }
});

export const {} = bestsellerSlice.actions;

export default bestsellerSlice.reducer;
