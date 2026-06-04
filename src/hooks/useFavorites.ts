import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import {
  FavoriteProduct,
  getFavorites,
} from '@/graphql/queries/favorites.service';

export function useFavorites() {
  const { me, isAuth } = useSelector((state: RootState) => state.authSlice);
  const userId = me?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);

  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (isAuth && !userId) {
      return;
    }
    try {
      setLoading(true);
      const favorites = await getFavorites();
      setProducts(favorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [isAuth, userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onUpdated = () => {
      reload();
    };
    window.addEventListener('favoritesUpdated', onUpdated);
    return () => window.removeEventListener('favoritesUpdated', onUpdated);
  }, [reload]);

  return { products, loading, reload, setProducts };
}
