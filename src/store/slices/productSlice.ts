import { createSlice, createAsyncThunk, PayloadAction, AsyncThunkConfig } from '@reduxjs/toolkit';
import { getSingleProduct } from '@/graphql/queries/products.service';
import { productSliceState, GetProductInput } from '@/types/productSlice';
import { ProductDetailNode } from '@/graphql/types/core.types';

const initialState: productSliceState = {
  loading: true,
  error: null,
  item: {
    name: '',
    rating: 5,
    reviews: [],
    description: '',
    slug: '',
    media: [],
    thumbnail: '',
    variants: [
      {
        node:{
        id: 'example',
        sku: 'example',
        name: 'Крем',
        pricing: {
          discount: {
            net: {
              amount: 5,
              currency: 'RUB'
            }
          },
          price: {
            gross: {
              amount: 2000,
              currency: 'RUB'
            }
          },
        priceUndiscounted: {
        gross: {
          amount: 0,
          currency: 'RUB'
        }
      }
   
        }
      }}
    ],
    attributes:[]
  },
  activeVariantId: null
};

export const getProductBySlug = createAsyncThunk<ProductDetailNode | null, GetProductInput>(
  'product/getProductInfoBySlug',
  async ({ slug }) => {
    const result = await getSingleProduct(slug);
    // console.log("***")
    // console.log(result)
    // console.log("***")
    return result;
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setActiveVariantId(state, action: PayloadAction<string>) {
     state.activeVariantId = action.payload
   }
  },
  extraReducers: builder => {
    builder
      .addCase(getProductBySlug.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductBySlug.fulfilled, (state, action) => {
        if (action.payload !== null) {
          state.item = {
            id: String(action.payload.id),
            name: action.payload.name,
            rating: action.payload.rating ?? 5,
            reviews: action.payload.reviews,
            description: action.payload.description,
            slug: action.payload.slug,
            media: action.payload.media,
            thumbnail: action.payload.thumbnail?.url || '',
            variants: action.payload.productVariants.edges,
            attributes: action.payload.attributes

          };
          state.activeVariantId = action.payload.productVariants.edges[0].node.id;
        }
        console.log("*** action-payload***")
         console.log(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(getProductBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      });
  }
});

export const {setActiveVariantId} = productSlice.actions;
export default productSlice.reducer;
