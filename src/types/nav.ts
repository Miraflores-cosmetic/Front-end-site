import { SerializedError } from '@reduxjs/toolkit';

export interface NavMenuItem {
  id: string;
  name: string;
  category: {
    id: string;
    slug: string;
    backgroundImage: {
      url: string;
    };
  };
}

export type NavCatalogTag = {
  id: string;
  name: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
};

export interface navSliceState {
  items: NavMenuItem[];
  tags: NavCatalogTag[];
  loading: boolean;
  tagsLoading: boolean;
  error: SerializedError | null;
  tagsError: SerializedError | null;
}

interface NavMenuRespEdges {
  node: {
    id: string;
    items: NavMenuItem[];
    name: string;
    slug: string;
  };
}

export interface NavMenuResponse {
  menus: {
    edges: NavMenuRespEdges[];
  };
}
