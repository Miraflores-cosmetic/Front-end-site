// --- Core Interface Types for GraphQL Nodes and Connections ---
import { ProductVariant } from '@/types/productSlice'


export interface Node {
  id: string | number;
}

export interface MutationError {
  field: string | null;
  message: string;
  code: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

export interface Edge<T extends Node> {
  node: T;
}

export interface Connection<T extends Node> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

// --- Specific E-commerce Node Types (Inferred from schema context) ---

/**
 * Represents a simplified Product object for lists.
 */
export interface ProductNode extends Node {
  name: string;
  slug: string;
  isPublished: boolean;
}

/**
 * Represents a detailed Product object.
 */
export interface ProductDetailNode extends ProductNode {
  description: string;
  descriptionPlaintext: string;
  productType: {
    name: string;
  };
  category: {
    name: string;
    id: string;
  };
  rating?: number;
  attributes:  Attribute[];
    media: {
    url: string
    alt: string
  }[]; 
  productVariants:{
      edges: ProductVariant[]
    }
  reviews:[
    {
      text:string
    }
  ]
   thumbnail: {
          alt: string
          url: string
        }
  // Complex nested field example
  pricing: {
    priceRange: {
      start: { net: { amount: number; currency: string } };
      stop: { net: { amount: number; currency: string } };
    };
  };
}

/**
 * Represents a Product Variant.
 */
export interface ProductVariantNode extends Node {
  name: string;
  sku: string;
  quantityAvailable: number;
}

/**
 * Represents a Warehouse for inventory.
 */
export interface WarehouseNode extends Node {
  name: string;
  slug: string;
  address: {
    city: string;
    country: string;
  };
}

/**
 * Represents a full Order object.
 */
export interface OrderNode extends Node {
  number: string | null; // Nullable for draft orders
  created: string;
  status: 'FULFILLED' | 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'CANCELED';
  statusDisplay?: string;
  isPaid?: boolean;
  paymentStatus?: 'NOT_CHARGED' | 'PENDING' | 'PARTIALLY_CHARGED' | 'FULLY_CHARGED' | 'PARTIALLY_REFUNDED' | 'FULLY_REFUNDED';
  paymentStatusDisplay?: string;
  total: {
    gross: { amount: number; currency: string };
  };
  userEmail: string;
  lines?: Array<{
    id: string;
    productName: string;
    quantity: number;
    variantName?: string;
    unitPrice?: {
      gross: { amount: number; currency: string };
    };
    thumbnail?: {
      url: string;
    };
    variant?: {
      product?: {
        slug?: string;
        thumbnail?: {
          url: string;
        };
      };
    };
  }>;
}

// --- Data Response Types ---

/**
 * Type for the top-level data response when fetching a list of products.
 */
export interface ProductsData {
  products: Connection<ProductNode>;
}

/**
 * Type for the top-level data response when fetching a single product.
 */
export interface ProductData {
  product: ProductDetailNode | null;
}

/**
 * Type for the top-level data response when fetching a list of warehouses.
 */
export interface WarehousesData {
  warehouses: Connection<WarehouseNode>;
}

/**
 * Type for the top-level data response when fetching a list of orders.
 */
export interface OrdersData {
  orders: Connection<OrderNode>;
}

// ---------------------------
// --- Mutation Response Types ---
// ---------------------------

/**
 * Standard mutation response structure for updating a product.
 */
export interface ProductUpdateMutationResponse {
  productUpdate: {
    product: ProductNode | null;
    errors: MutationError[];
  };
}

/**
 * Standard mutation response structure for fulfilling an order.
 */
export interface OrderFulfillMutationResponse {
  orderFulfill: {
    order: OrderNode | null;
    errors: MutationError[];
  };
}


interface Attribute {
  attribute: {
    id: string;
    name: string;
    slug: string;
    metadata: any[];
  };
  values: AttributeValue[];
}


 interface AttributeValue {
  boolean: boolean | null;
  date: string | null;
  dateTime: string | null;
  externalReference: string | null;
  inputType: string;
  name: string;
  plainText: string | null;
  reference: string | null;
  richText: any;
  slug: string;
}