import React, { useMemo, useState } from 'react';
import styles from './FavoritesContent.module.scss';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { clearAllFavorites, type FavoriteProduct } from '@/services/favorites.service';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import { useToast } from '@/components/toast/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { useFavorites } from '@/hooks/useFavorites';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { ConfirmModal } from '@/components/confirm-modal/ConfirmModal';
import {
  ProfileEmptyState,
  ProfileLoadingState,
  ProfileSection,
} from '@/pages/Profile/components/ProfileSection';
import type { BestSellersProduct } from '@/types/products';

interface FavoritesContentProps {
  setOpenAccordion?: React.Dispatch<React.SetStateAction<TabId | null>>;
}

function mapFavoriteToCard(product: FavoriteProduct): BestSellersProduct {
  return {
    id: product.variantId || product.id,
    productId: product.productId,
    title: product.title || product.name,
    slug: product.slug,
    description: product.description,
    size: product.size,
    price: product.price,
    oldPrice: product.oldPrice,
    discount: product.discount,
    images: product.images,
    thumbnail: product.thumbnail,
    productVariants: product.productVariants,
    collections: product.collections ?? { id: '', name: '', slug: '' },
    attributes: product.attributes,
  };
}

function formatCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} товара`;
  return `${count} товаров`;
}

const FavoritesContent: React.FC<FavoritesContentProps> = ({ setOpenAccordion }) => {
  const { products, loading, setProducts } = useFavorites();
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const isMobile = useScreenMatch();

  const cards = useMemo(() => products.map(mapFavoriteToCard), [products]);

  const handleClearAll = async () => {
    setConfirmOpen(false);
    setClearing(true);
    try {
      await clearAllFavorites();
      await dispatch(getMe());
      setProducts([]);
      window.dispatchEvent(new Event('favoritesUpdated'));
      toast.success('Избранное очищено');
    } catch (error: unknown) {
      console.error('Error clearing favorites:', error);
      toast.error('Ошибка при очистке избранного');
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <ProfileSection
        title="Избранное"
        isMobile={isMobile}
        onClose={setOpenAccordion ? () => setOpenAccordion(null) : undefined}
        className={styles.favoritesContent}
      >
        {loading ? (
          <ProfileLoadingState message="Загрузка избранного..." />
        ) : products.length > 0 ? (
          <>
            <div className={styles.toolbar}>
              <p className={styles.count}>{formatCount(products.length)}</p>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setConfirmOpen(true)}
                disabled={clearing}
              >
                {clearing ? 'Очистка...' : 'Очистить всё'}
              </button>
            </div>

            <div className={styles.grid}>
              {cards.map(product => (
                <div key={product.id} className={styles.cardCell}>
                  <BestSellerProductCard product={product} loading={false} fluid />
                </div>
              ))}
            </div>
          </>
        ) : (
          <ProfileEmptyState
            message="Нет товаров в избранном"
            actionLabel="Перейти в каталог"
            actionHref="/catalog"
          />
        )}
      </ProfileSection>

      <ConfirmModal
        open={confirmOpen}
        title="Очистить всё избранное?"
        confirmLabel="Очистить"
        onConfirm={() => void handleClearAll()}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default FavoritesContent;
