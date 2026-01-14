import { SerializedError } from '@reduxjs/toolkit';

export interface NavMenuItem {
  id: string;
  name: string;
  category: {
    id: string;
    slug: string;
    backgroundImage: {
              url: string
     }
  };
}

export interface navSliceState {
  items: NavMenuItem[];
  loading: boolean;
  error: SerializedError | null;
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
