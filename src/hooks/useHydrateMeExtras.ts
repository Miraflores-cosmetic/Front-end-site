import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hydrateMeExtras } from '@/store/slices/authSlice';
import type { AppDispatch, RootState } from '@/store/store';

/** Подгрузка адресов и total заказов — только checkout/profile, не cold home. */
export function useHydrateMeExtras(active = true) {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuth, meExtrasLoaded } = useSelector((state: RootState) => state.authSlice);

  useEffect(() => {
    if (!active || !isAuth || meExtrasLoaded) return;
    dispatch(hydrateMeExtras());
  }, [active, isAuth, meExtrasLoaded, dispatch]);
}
