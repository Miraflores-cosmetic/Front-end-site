import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import {
  addToFavorites,
  removeFromFavorites,
  hydrateFavoriteIds,
  isFavoriteSync,
  subscribeFavoriteIds,
} from '@/services/favorites.service';
import { useToast } from '@/components/toast/toast';
import { getMe } from '@/store/slices/authSlice';
import heartIcon from '@/assets/icons/heart.svg';
import heartRedIcon from '@/assets/icons/heartRed.svg';
import styles from './FavoriteButton.module.scss';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  /** overlay — на карточке; inline — рядом с ATC */
  variant?: 'overlay' | 'inline';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  className,
  variant = 'overlay',
}) => {
  const [favorite, setFavorite] = useState(() => isFavoriteSync(productId));
  const [loading, setLoading] = useState(false);
  const { isAuth } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();

  useEffect(() => {
    if (!isAuth || !productId) {
      setFavorite(false);
      return;
    }

    setFavorite(isFavoriteSync(productId));
    void hydrateFavoriteIds();

    return subscribeFavoriteIds(() => {
      setFavorite(isFavoriteSync(productId));
    });
  }, [isAuth, productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuth) {
      toast.error('Войдите в аккаунт, чтобы добавить товар в избранное');
      return;
    }

    if (loading) return;

    setLoading(true);
    const next = !favorite;
    setFavorite(next);
    try {
      if (!next) {
        await removeFromFavorites(productId);
        toast.success('Товар удален из избранного');
      } else {
        await addToFavorites(productId);
        toast.success('Товар добавлен в избранное');
      }
      dispatch(getMe()).catch((err) => {
        console.error('Error updating user data:', err);
      });
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (error: any) {
      setFavorite(!next);
      console.error('Error toggling favorite:', error);
      toast.error(error?.message || 'Ошибка при изменении избранного');
    } finally {
      setLoading(false);
    }
  };

  const iconSrc = favorite ? heartRedIcon : heartIcon;

  return (
    <button
      type="button"
      className={[
        styles.favoriteButton,
        variant === 'inline' ? styles.inline : styles.overlay,
        favorite ? styles.active : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleToggle}
      disabled={loading}
      aria-label={favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      aria-pressed={favorite}
    >
      <img src={iconSrc} alt="" aria-hidden />
    </button>
  );
};
