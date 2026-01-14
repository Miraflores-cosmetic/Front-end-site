import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type DrawerType =
  | 'basket'
  | 'address'
  | 'menu'
  | 'profile'
  | 'about'
  | 'add-comment'
  | 'search'
  | null;

interface DrawerState {
  activeDrawer: DrawerType;
}

const initialState: DrawerState = {
  activeDrawer: null
};

const drawerSlice = createSlice({
  name: 'drawer',
  initialState,
  reducers: {
    openDrawer: (state, action: PayloadAction<DrawerType>) => {
      state.activeDrawer = action.payload;
    },
    closeDrawer: state => {
      state.activeDrawer = null;
    }
  }
});

export const { openDrawer, closeDrawer } = drawerSlice.actions;
export default drawerSlice.reducer;
