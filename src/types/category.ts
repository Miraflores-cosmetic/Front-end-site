import { SerializedError } from '@reduxjs/toolkit';
import { BestSellersProduct } from '@/types/products';

export interface categorySliceState {
  title: string;
  description: string;

  /** Верхний ряд табов (первый уровень категорий) */
  tabs: CategoryTab[];
  activeTabSlug: string | null;

  /** Второй ряд табов (вложенные подкатегории выбранного таба) */
  subTabs: CategoryTab[];
  activeSubTabSlug: string | null;

  slug: string | null;
  loading: boolean;
  error: SerializedError | null;
  products: BestSellersProduct[];
  pageInfo: CategoryPageInfo;
}

export interface getCategoryProductsArgs {
  first: number;
  slug: string;
  after?: string | null;
  append?: boolean;
}

export interface CategoryTab {
  name: string;
  slug: string | null;
}

export type CategoryPageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};