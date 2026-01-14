import { SerializedError } from '@reduxjs/toolkit';

export interface productSliceState{
  item: ProductSliceItem;  
  loading: boolean;
  error: SerializedError | null;
  activeVariantId: null | string;

}

export interface GetProductInput {
   slug: string;
}

export interface ProductSliceItem {
    id?: string;
    name: string
    rating: number
    reviews: ProductReview[]
    description: string;
    slug: string;
    media: {
        url: string
        alt: string
    }[];  
    variants: ProductVariant[]
    thumbnail: string
    attributes: Attribute[];
}


export interface ProductDetailNode  {
  id: string | number
  name: string;
  rating?: number;
  slug: string;
  media: {
    url: string
    alt: string
  }[];   

  isPublished: boolean;  
  description: string;
  descriptionPlaintext: string;
  productType: {
    name: string;
  };
  category: {
    name: string;
    id: string;
  };
  reviews:ProductReview[]

  
  // Complex nested field example
  pricing: {
    priceRange: {
      start: { net: { amount: number; currency: string } };
      stop: { net: { amount: number; currency: string } };
    };
  };
  productVariants:{
    edges: ProductVariant[]
  }
     thumbnail: {
          alt: string
          url: string
        }
}

interface ProductReview{
    text:string
}

export interface ProductVariant {
    node:{
  id: string;
  sku: string;
  name: string;
  attributes?: Attribute[]; // Атрибуты варианта (для получения объёма)
  pricing: {
    price: {
      currency?: string;
      gross: {
        amount: number;
        currency?: string;
      };

    };
    priceUndiscounted:{
         gross: {
        amount: number;
        currency?: string;
      };
    };
    discount :{
          net: {
        amount: number;
        currency?: string;
      };
    }
  };
}
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
