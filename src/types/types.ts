import { BestsellerProduct } from '@/graphql/types/products.types';

export interface Product extends BestsellerProduct {
  rating: number ;

  productVariants: ProductVariantss;
  reviews: [
    {
      text: string;
    }
  ];
  title?: string;
  price?: number,
  oldPrice?: number,
  discount?: number,
   image?: string[],
   stars?: number,
   hoverImage?: string,
   label?: string,
}

export interface ProductVariantss {
  edges: ProductVariantEdge[];
  totalCount: number;
}

export interface ProductVariantEdge {
  node: ProductVariantNode;
}

export interface ProductVariantNode {
  id: string;
  name: string;
  pricing: ProductPricing;
  sku: string | null;
  weight: ProductWeight;
}

export interface ProductPricing {
  discount: Discount | null;
  price: Price;
  priceUndiscounted: Price;
}

export interface Discount {
  gross: MoneyAmount; // FIXED
}

export interface Price {
  gross: MoneyAmount;
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface ProductWeight {
  unit: string;
  value: number;
}
