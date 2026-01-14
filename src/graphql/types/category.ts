import { Connection } from './core.types';

export interface Categories {
  edges: any;
  categories: {
    edges: {
      node: {
        id: string;
        description: string;
        name: string;
        slung: string;
        parent: {
          name: string;
          id: string;
          slug: string;
        };
      };
    };
    totalCount: number;
  };
}

export interface CategoryConnection {
  categories: Categories;
}
export interface SingleCategoryConnection {
  category: SingleCategory;
}

export interface SingleCategory {
  category: {
    id: string;
    description: string;
    metadata: {
      key: string;
      value: string;
    };
    name: string;
    slug: string;
    products: {
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
      totalCount: number;
      edges: {
        node: {
          description: string;
          id: string;
          isAvaibleForPurchase: boolean;
          media: {
            alt: string;
            url: string;
          };
          name: string;
          pricing: {
            discounts: {
              gross: {
                fractionalAmount: number;
                amount: number;
                currency: string;
              };
            };
          };
          slug: string;
          thumbnail: {
            alt: string;
            url: string;
          };
          weight: {
            unit: string;
            value: number;
          };
          category: {
            name: string;
            slug: string;
          };
        };
      };
    };
  };
}
