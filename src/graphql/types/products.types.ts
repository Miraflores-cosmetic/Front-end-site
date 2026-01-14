import { Connection } from './core.types';

export interface BestsellerProduct {
  id: string | number;
  description: string;
  thumbnail: {
    url: string;
    alt: string;
  };
  media: MediaItem[];
  attributes: Attribute[];
  metadata: {
    key: string;
    value: string;
  };
  slug: string;
  name: string;

  pricing: {
    discount: {
      gross: {
        amount: number;
        fractionalAmount: number;
        currency: string;
      };
    };
  };
}

export interface MediaItem {
  url: string;
  alt: string;
}
export interface BestsellerProducts extends Connection<BestsellerProduct> {
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface BestsellerConnection {
  products: BestsellerProducts;
}

export interface AttributeValue {
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

export interface Attribute {
  attribute: {
    id: string;
    name: string;
    slug: string;
    metadata: any[];
  };
  values: AttributeValue[];
}
