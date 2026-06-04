import React, { useState } from 'react';
import styles from './FavoritesContent.module.scss';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { clearAllFavorites } from '@/graphql/queries/favorites.service';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import { useToast } from '@/components/toast/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoritesContentProps {
  setOpenAccordion?: React.Dispatch<React.SetStateAction<TabId | null>>;
}

const FavoritesContent: React.FC<FavoritesContentProps> = () => {
  const { products, loading, reload, setProducts } = useFavorites();
  const [clearing, setClearing] = useState(false);
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const handleClearAll = async () => {
    if (!window.confirm('Вы уверены, что хотите очистить все избранное?')) {
      return;
    }

    setClearing(true);
    try {
      await clearAllFavorites();
      await dispatch(getMe());
      setProducts([]);
      window.dispatchEvent(new Event('favoritesUpdated'));
      toast.success('Избранное очищено');
    } catch (error: any) {
      console.error('Error clearing favorites:', error);
      toast.error('Ошибка при очистке избранного');
    } finally {
      setClearing(false);
    }
  };

  return (
    <article className={styles.favoritesContent}>
      <div className={styles.titleWrapper}>
        <p className={styles.title}>Избранное</p>
        {products.length > 0 && (
          <button
            className={styles.clearButton}
            onClick={handleClearAll}
            disabled={clearing}
          >
            {clearing ? 'Очистка...' : 'Очистить избранное'}
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка избранного...</div>
      ) : products.length > 0 ? (
        <article className={styles.container}>
          {products.map(product => (
            <BestSellerProductCard
              key={product.id}
              product={product}
              loading={false}
            />
          ))}
        </article>
      ) : (
        <div className={styles.emptyState}>Нет товаров в избранном</div>
      )}
    </article>
  );
};

export default FavoritesContent;
