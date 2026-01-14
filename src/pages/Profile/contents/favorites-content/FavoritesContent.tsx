import React, { useEffect, useState } from 'react';
import styles from './FavoritesContent.module.scss';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { getFavorites, clearAllFavorites } from '@/graphql/queries/favorites.service';
import FavoriteCard from './FavoriteCart';
import { useToast } from '@/components/toast/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';

interface InfoMobileContentProps {
  setOpenAccordion: React.Dispatch<React.SetStateAction<TabId | null>>;
}

const FavoritesContent: React.FC<InfoMobileContentProps> = ({ setOpenAccordion }) => {
  const isMobile = useScreenMatch(450);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    async function loadFavorites() {
      try {
        setLoading(true);
        const favorites = await getFavorites();
        setProducts(favorites);
      } catch (error: any) {
        console.error('Error loading favorites:', error);
        toast.error('Ошибка при загрузке избранного');
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, []);

  // Обновляем избранное при изменении (например, после добавления/удаления через сердечко)
  useEffect(() => {
    const handleStorageChange = () => {
      // Перезагружаем избранное при изменении в localStorage или других событиях
      async function reloadFavorites() {
        try {
          const favorites = await getFavorites();
          setProducts(favorites);
        } catch (error: any) {
          console.error('Error reloading favorites:', error);
        }
      }
      reloadFavorites();
    };

    // Слушаем события изменения избранного (можно добавить кастомное событие)
    window.addEventListener('favoritesUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleStorageChange);
    };
  }, []);

  const handleCloseAccordion = () => {
    setOpenAccordion(null);
  };

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
            <FavoriteCard
              key={product.id}
              id={product.id}
              title={product.name}
              description=""
              price={product.price}
              oldPrice={product.oldPrice}
              discount={product.discount}
              image={product.thumbnail || ''}
              hoverImage={product.thumbnail || ''}
              slug={product.slug}
              variantId={product.variantId || product.id}
            />
          ))}
        </article>
      ) : (
        <div className={styles.emptyState}>Нет товаров в избранном</div>
      )}

      {isMobile && (
        <p className={styles.closeBtn} onClick={handleCloseAccordion}>
          Закрыть
        </p>
      )}
    </article>
  );
};

export default FavoritesContent;
