export interface CardItem {
  id: number;
  image: string;
  alt: string;
  name: string;
  size: string;
  discount: string;
  count: string;
  priceOld?: string;
  priceNew?: string;
  isGift?: boolean;
}

interface Product {
  id: number;
  name: string;
  size: string;
  price: number;
  oldPrice?: number;
  discount?: string;
  image: string;
  isGift?: boolean;
  quantity?: number;
}

export interface TotalAccordionProps {
  total: number;
  totalOld?: number;
  totalItems: number;
  products: Product[];
  discount?: number;
  promo?: number;
  hasPayableLines?: boolean;
  addressSelected?: boolean;
  shippingRub?: number | null;
  shippingLoading?: boolean;
  shippingError?: string | null;
}
