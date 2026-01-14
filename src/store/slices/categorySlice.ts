import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getCategoryBySlug, getCategoryTabsBySlug } from '@/graphql/queries/category.service';
import { categorySliceState, CategoryTab, getCategoryProductsArgs } from '@/types/category';
import { BestSellersProduct } from '@/types/products';

const initialState: categorySliceState = {
  tabs: [],
  activeTabSlug: null,
  subTabs: [],
  activeSubTabSlug: null,
  slug: null,
  title: '',
  description: '',
  loading: false,
  error: null,
  products: [],
  pageInfo: { hasNextPage: false, endCursor: null }
};

// 1-й уровень табов: дети корневой категории (/category/:slug)
export const getCategoryTabs = createAsyncThunk<CategoryTab[], getCategoryProductsArgs>(
  'category/getTabs',
  async ({ first, slug }) => {
    const children = await getCategoryTabsBySlug(first, slug);

    return children
      .map((c: any) => ({
        name: c.name,
        slug: c.slug && c.slug.trim() !== '' ? c.slug : null
      }))
      .filter((t: CategoryTab) => t.slug !== null);
  }
);

// 2-й уровень табов: дети выбранного таба первого уровня
export const getSubCategoryTabs = createAsyncThunk<CategoryTab[], string>(
  'category/getSubTabs',
  async slug => {
    const children = await getCategoryTabsBySlug(50, slug);

    return children
      .map((c: any) => ({
        name: c.name,
        slug: c.slug && c.slug.trim() !== '' ? c.slug : null
      }))
      .filter((t: CategoryTab) => t.slug !== null);
  }
);

export const getCategoryProducts = createAsyncThunk<any, getCategoryProductsArgs>(
  'category/getProducts',
  async ({ first, slug, after }) => {
    return getCategoryBySlug(first, slug, after);
  }
);

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    setActiveTabSlug(state, action: PayloadAction<string | null>) {
      state.activeTabSlug = action.payload;
      // при смене таба верхнего уровня сбрасываем второй уровень и продукты
      state.subTabs = [];
      state.activeSubTabSlug = 'ALL'; // По умолчанию выбираем "ВСЕ"
      state.products = [];
      state.pageInfo = { hasNextPage: false, endCursor: null };
    },
    setActiveSubTabSlug(state, action: PayloadAction<string | null>) {
      state.activeSubTabSlug = action.payload;
      state.products = [];
      state.pageInfo = { hasNextPage: false, endCursor: null };
    },
    resetCategoryState(state) {
      state.tabs = [];
      state.subTabs = [];
      state.title = '';
      state.description = '';
      state.activeTabSlug = null;
      state.activeSubTabSlug = null;
      state.products = [];
      state.pageInfo = { hasNextPage: false, endCursor: null };
      state.loading = false;
    }
  },
  extraReducers: builder => {
    builder
      // 1-й уровень табов
      .addCase(getCategoryTabs.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategoryTabs.fulfilled, (state, action) => {
        state.tabs = action.payload;
        state.activeTabSlug = action.payload[0]?.slug ?? null;
        state.loading = false;
      })
      .addCase(getCategoryTabs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      })

      // 2-й уровень табов
      .addCase(getSubCategoryTabs.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubCategoryTabs.fulfilled, (state, action) => {
        state.subTabs = action.payload;
        // По умолчанию выбираем "ВСЕ" (ALL), чтобы показать все товары категории
        state.activeSubTabSlug = 'ALL';
        state.loading = false;
      })
      .addCase(getSubCategoryTabs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      })

      // продукты выбранной (вложенной) категории
      .addCase(getCategoryProducts.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategoryProducts.fulfilled, (state, action) => {
        const append = !!action.meta.arg.append;

        const newBProducts: BestSellersProduct[] = [];
        action.payload.products.edges.forEach((edge: any) => {
          const node = edge.node;
          const thumbnailUrl = node.thumbnail?.url || (node.media?.[0]?.url ?? '');
          const images = Array.isArray(node.media)
            ? node.media
                .map((item: any) => item?.url)
                .filter(Boolean)
            : [];
          // Извлекаем описание из атрибутов продукта
          let description = '';
          if (node.attributes && Array.isArray(node.attributes)) {
            const descAttr = node.attributes.find((attr: any) => 
              attr.attribute?.slug === 'opisanie-v-kartochke-tovara' || 
              attr.attribute?.name?.toLowerCase().includes('описание') ||
              attr.attribute?.name?.toLowerCase().includes('description')
            );
            if (descAttr?.values?.[0]?.plainText) {
              description = descAttr.values[0].plainText;
            } else if (descAttr?.values?.[0]?.name) {
              description = descAttr.values[0].name;
            }
          }
          
          // Если не нашли в атрибутах, пробуем стандартное описание
          if (!description) {
            try {
              if (node.description) {
                const parsed = JSON.parse(node.description);
                description = parsed?.blocks?.[0]?.data?.text || '';
              }
            } catch (e) {
              description = node.description || '';
            }
          }
          
          // Чистим описание (убираем HTML теги, но не обрезаем текст)
          if (description) {
            description = description.replace(/<[^>]+>/g, '').trim();
            // Убрали обрезку текста - теперь полный текст отображается
          }
          
          // Обрабатываем варианты: извлекаем объем из атрибутов (как в bestsellersSlice)
          const variants = (node.productVariants?.edges || []).map((v: any) => {
            // Извлекаем название варианта (может быть в атрибутах или в name)
            let variantName = v.node?.name || '';
            
            // Ищем атрибут "Объем" или "Volume" в варианте
            if (v.node?.attributes && Array.isArray(v.node.attributes)) {
              const volumeAttr = v.node.attributes.find((attr: any) => 
                attr.attribute?.slug === 'obem' || 
                attr.attribute?.slug === 'volume' ||
                attr.attribute?.name?.toLowerCase().includes('объем') ||
                attr.attribute?.name?.toLowerCase().includes('volume')
              );
              if (volumeAttr?.values?.[0]?.name) {
                variantName = volumeAttr.values[0].name;
              } else if (volumeAttr?.values?.[0]?.plainText) {
                variantName = volumeAttr.values[0].plainText;
              }
            }
            
            return {
              ...v,
              node: {
                ...v.node,
                name: variantName
              }
            };
          });
          // Вычисляем цены и скидку
          const currentPrice = node.defaultVariant?.pricing?.price?.gross?.amount ?? 0;
          const undiscountedPrice = node.defaultVariant?.pricing?.priceUndiscounted?.gross?.amount;
          const discountAmount = node.defaultVariant?.pricing?.discount?.gross?.amount;
          
          // Расширенное логирование для отладки скидок
          if (node.name) {
            const hasDiscountData = undiscountedPrice || discountAmount;
            const pricingData = node.defaultVariant?.pricing;
          }
          
          // Старая цена (если есть скидка)
          const oldPrice = undiscountedPrice && undiscountedPrice > currentPrice ? undiscountedPrice : null;
          
          // Процент скидки
          let discountPercent: number | undefined = undefined;
          if (oldPrice && oldPrice > 0 && oldPrice !== currentPrice) {
            discountPercent = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
          } else if (discountAmount && discountAmount > 0) {
            // Если скидка указана в абсолютных значениях, вычисляем процент от текущей цены + скидка
            const originalPrice = currentPrice + discountAmount;
            if (originalPrice > 0) {
              discountPercent = Math.round((discountAmount / originalPrice) * 100);
            }
          }
          
          newBProducts.push({
            id: node.defaultVariant?.id ?? node.id,
            size: node.defaultVariant?.name,
            title: node.name,
            description,
            price: currentPrice,
            oldPrice: oldPrice || undefined,
            discount: discountPercent,
            images,
            thumbnail: thumbnailUrl,
            slug: node.slug,
            productVariants: variants,
            collections: node.collections || []
          });
        });

        state.title = action.payload.name ?? '';
        let catDesc = '';
        try {
          if (action.payload.description) {
            const parsed = JSON.parse(action.payload.description);
            catDesc = parsed?.blocks?.[0]?.data?.text || '';
          }
        } catch {
          catDesc = action.payload.description || '';
        }
        state.description = catDesc.replace(/<[^>]+>/g, '').trim();

        state.pageInfo = {
          hasNextPage: !!action.payload.products?.pageInfo?.hasNextPage,
          endCursor: action.payload.products?.pageInfo?.endCursor ?? null
        };

        if (!append) {
          state.products = newBProducts;
        } else {
          const map = new Map<string, BestSellersProduct>();
          for (const p of state.products) map.set(String(p.id), p);
          for (const p of newBProducts) map.set(String(p.id), p);
          state.products = Array.from(map.values());
        }
        state.loading = false;
        state.error = null;
      })
      .addCase(getCategoryProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error;
      });
  }
});

export const { setActiveTabSlug, setActiveSubTabSlug, resetCategoryState } = categorySlice.actions;
export default categorySlice.reducer;
