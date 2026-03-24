import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AddressInfo } from '@/types/auth';

type DrawerType =
  | 'basket'
  | 'address'
  | 'menu'
  | 'profile'
  | 'about'
  | 'add-comment'
  | 'search'
  | null;

export interface AddressDrawerState {
  editingAddressId: string | null;
  seed: AddressInfo | null;
}

interface DrawerState {
  activeDrawer: DrawerType;
  /** Контекст только для дроера адреса: редактирование или новый */
  addressDrawer: AddressDrawerState | null;
}

const initialState: DrawerState = {
  activeDrawer: null,
  addressDrawer: null,
};

const drawerSlice = createSlice({
  name: 'drawer',
  initialState,
  reducers: {
    openDrawer: (state, action: PayloadAction<DrawerType>) => {
      state.activeDrawer = action.payload;
      if (action.payload === 'address') {
        state.addressDrawer = { editingAddressId: null, seed: null };
      } else {
        state.addressDrawer = null;
      }
    },
    /** Открыть дроер адреса: без payload — новый адрес, с address — правка с предзаполнением */
    openAddressDrawer: (
      state,
      action: PayloadAction<{ address?: AddressInfo | null } | undefined>,
    ) => {
      state.activeDrawer = 'address';
      const addr = action.payload?.address;
      if (addr) {
        state.addressDrawer = { editingAddressId: addr.id, seed: addr };
      } else {
        state.addressDrawer = { editingAddressId: null, seed: null };
      }
    },
    closeDrawer: (state) => {
      state.activeDrawer = null;
      state.addressDrawer = null;
    },
  },
});

export const { openDrawer, openAddressDrawer, closeDrawer } = drawerSlice.actions;
export default drawerSlice.reducer;
