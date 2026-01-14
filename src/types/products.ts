export interface ProductNode {
  id: string;
  name: string;
  slug: string;
  defaultVariant: BestSellersProductVariant;
  description: any;
  thumbnail: {
    url: string;
    alt: string;
  };
  media: {
    url: string;
    alt: string;
  }[];
  category: {
    id: string;
    name: string;
  };
  collections: ProductCollections;
  productVariants: ProductVariant[];
}

export interface BestSellersProduct {
  id: string; // ID варианта (для обратной совместимости)
  productId?: string; // ID продукта (для исключения)
  size: string;
  title: string;
  description: string;
  slug: string;
  price: number;
  stars?: 1 | 2 | 3 | 4 | 5;
  reviews?: number;
  oldPrice?: number;
  discount?: number;
  label?: string;
  images: string | string[];
  thumbnail: string;
  productVariants: ProductVariant[];
  collections: ProductCollections;
  attributes?: Array<{
    attribute: {
      id: string;
      name: string;
      slug: string;
    };
    values: Array<{
      name?: string;
      slug?: string;
      plainText?: string;
      richText?: any;
    }>;
  }>;
}

export interface ProductEdge {
  node: ProductNode;
}
export interface ProductCollections {
  id: string;
  name: string;
  slug: string;
}

export interface ProductsConnection {
  edges: ProductEdge[];
}

export interface ProductsData {
  products: ProductsConnection;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BestSellersResponse {
  collection: {
    id?: string;
    name?: string;
    products: {
      edges: ProductEdge[];
    };
  };
}

export interface BestSellersProductVariant {
  id?: string;
  sku: string;
  name: string;
  pricing: {
    price: {
      currency?: string;
      gross: {
        amount: number;
        currency?: string;
      };
    };
  };
}

export interface BestsellerConnection {
  edges: ProductEdge[];
}

export interface ProductVariant {
  node: {
    id: string;
    sku: string;
    name: string;
    attributes?: Array<{
      attribute: {
        id: string;
        name: string;
        slug: string;
      };
      values: Array<{
        name?: string;
        slug?: string;
        plainText?: string;
      }>;
    }>;
    pricing: {
      discount: {
        net: {
          amount: number;
          currency: string;
        };
      };
      price: {
        gross: {
          amount: number;
          currency: string;
        };
      };
      priceUndiscounted?: {
        gross: {
          amount: number;
          currency: string;
        };
      };
    };
  };
}
