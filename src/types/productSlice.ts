import { SerializedError } from '@reduxjs/toolkit';

export interface productSliceState {
  item: ProductSliceItem | null;
  loading: boolean;
  notFound: boolean;
  /** slug последнего запрошенного товара — отсекает stale fulfilled */
  requestedSlug: string | null;
  error: SerializedError | null;
  activeVariantId: null | string;
}

export interface GetProductInput {
  slug: string;
}

export interface ProductReview {
  id?: string;
  rating?: number;
  text: string;
  createdAt?: string;
  image1?: string | null;
  image2?: string | null;
}

export interface ProductSliceItem {
  id?: string;
  name: string;
  /** @deprecated UI берёт рейтинг из useProductReviews */
  rating?: number;
  /** @deprecated UI берёт отзывы из useProductReviews */
  reviews?: ProductReview[];
  description: string;
  pageShortDescriptionHtml?: string;
  actionEffectHtml?: string;
  applicationHtml?: string;
  compositionHtml?: string;
  importantNoteHtml?: string;
  mirafloresNoteHtml?: string;
  storageHtml?: string;
  purpose?: string;
  shelfLife?: string;
  productTypeName?: string;
  catalogTags?: Array<{ id: string; name: string; slug: string; sortOrder?: number }>;
  category?: { id: string; name: string; slug?: string } | null;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalPath?: string | null;
  seoNoIndex?: boolean;
  media: {
    url: string;
    alt: string;
    id?: string;
    sortOrder?: number | null;
    mediaType?: 'image' | 'video' | string | null;
  }[];
  variants: ProductVariant[];
  thumbnail: string;
  attributes: Attribute[];
}

export interface ProductVariant {
  node: {
    id: string;
    sku: string;
    name: string;
    quantityAvailable?: number | null;
    trackInventory?: boolean | null;
    quantityLimitPerCustomer?: number | null;
    attributes?: Attribute[];
    media?: {
      id: string;
      url: string;
      alt: string;
      sortOrder?: number | null;
    }[];
    pricing: {
      price: {
        currency?: string;
        gross: {
          amount: number;
          currency?: string;
        };
      };
      priceUndiscounted?: {
        gross: {
          amount: number;
          currency?: string;
        };
      };
      discount?: {
        net: {
          amount: number;
          currency?: string;
        };
      };
    };
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
