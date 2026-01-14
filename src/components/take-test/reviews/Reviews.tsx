import React, { useEffect, useState } from 'react';
import styles from './Reviews.module.scss';
import img1 from '@/assets/images/etap3.webp';
import img2 from '@/assets/images/etap2.webp';
import ArrowToRight from '@/assets/icons/ArrowToRight.svg';

import { Review } from './review/Review';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { Link, useNavigate } from 'react-router-dom';
import { getAllPublishedReviews } from '@/graphql/queries/reviewsAll.service';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

interface ReviewData {
  images: string[];
  title: string;
  subtitle: string;
  text: string;
  rating: number;
  date: string;
}

export const Reviews: React.FC = () => {
  const isMobile = useScreenMatch(500);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const navigate = useNavigate();
  const { isAuth } = useSelector((state: RootState) => state.authSlice);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await getAllPublishedReviews();

        const mapped = data.map(r => ({
          images: [r.image1, r.image2].filter(Boolean) as string[],
          title: r.product.name,
          subtitle: r.product.thumbnail || '',
          text: r.text,
          rating: r.rating,
          date: new Date(r.createdAt).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }));

        // На главной показываем только первые 3 отзыва
        setReviews(mapped.slice(0, 3));
      } catch (error) {
        console.error('Error loading reviews:', error);
      }
    }
    loadReviews();
  }, []);

  const handleLeaveReviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Проверяем авторизацию через токен (на случай, если Redux еще не обновился)
    const token = localStorage.getItem('token');
    const isAuthenticated = isAuth || (token && token !== 'null' && token !== 'undefined');
    
    if (isAuthenticated) {
      // Если авторизован - ведем в раздел заказов профиля
      navigate('/profile?tab=orders');
    } else {
      // Если не авторизован - ведем на страницу авторизации
      navigate('/sign-in');
    }
  };

  return (
    <section className={styles.reviewsContainer}>
      <div className={styles.titleWrapper}>
        <p className={styles.title}>Отзывы</p>
        <Link 
          to="#" 
          onClick={handleLeaveReviewClick}
          className={styles.setReview}
        >
          <p>оставить отзыв</p>
          <img src={ArrowToRight} alt='' />
        </Link>
      </div>

      <div className={styles.reviewsWrapper}>
        <div>
          {reviews.length > 0 ? (
            reviews.map((review, index) => <Review key={index} {...review} />)
          ) : (
            <p className={styles.noReviews}>Пока нет отзывов </p>
          )}
        </div>
      </div>

      {!isMobile && (
        <div className={styles.allWrapper}>
          <Link to='/reviews/' className={styles.setReview}>
            <p>ВСЕ ОТЗЫВЫ</p>
          </Link>
          <img src={ArrowToRight} alt='' />
        </div>
      )}
    </section>
  );
};
