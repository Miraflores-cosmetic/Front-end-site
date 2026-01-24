import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { addToFavorites, removeFromFavorites, isFavorite } from '@/graphql/queries/favorites.service';
import { useToast } from '@/components/toast/toast';
import { getMe } from '@/store/slices/authSlice';
import heartIcon from '@/assets/icons/heart.svg';
import heartFilledIcon from '@/assets/icons/whiteHeart.svg';
import styles from './FavoriteButton.module.scss';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ productId, className }) => {
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuth } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();

  useEffect(() => {
    if (isAuth && productId) {
      checkFavorite();
    }
  }, [isAuth, productId]);

  const checkFavorite = async () => {
    try {
      const result = await isFavorite(productId);
      setFavorite(result);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuth) {
      toast.error('Войдите в аккаунт, чтобы добавить товар в избранное');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (favorite) {
        await removeFromFavorites(productId);
        setFavorite(false);
        toast.success('Товар удален из избранного');
      } else {
        await addToFavorites(productId);
        setFavorite(true);
        toast.success('Товар добавлен в избранное');
      }
      // Обновляем данные пользователя (не ждём результата, чтобы не блокировать UI)
      dispatch(getMe()).catch(err => {
        console.error('Error updating user data:', err);
        // Не показываем ошибку пользователю, так как основная операция успешна
      });
      // Отправляем событие обновления избранного для обновления списка в профиле
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error?.message || 'Ошибка при изменении избранного');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`${styles.favoriteButton} ${className || ''} ${favorite ? styles.active : ''}`}
      onClick={handleToggle}
      disabled={loading}
      aria-label={favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <img
        src={favorite ? heartFilledIcon : heartIcon}
        alt={favorite ? 'В избранном' : 'Добавить в избранное'}
      />
    </button>
  );
};

