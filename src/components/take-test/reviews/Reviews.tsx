import React, { useEffect, useState, useRef } from 'react';
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

export const Reviews: React.FC<{ variant?: 'preview' | 'page' }> = ({ variant = 'preview' }) => {
  const isMobile = useScreenMatch(500);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const navigate = useNavigate();
  const { isAuth } = useSelector((state: RootState) => state.authSlice);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const showAll = variant === 'page';

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await getAllPublishedReviews();

        const mapped = data.map(r => ({
          images: [r.image1, r.image2].filter(Boolean) as string[],
          title: r.product.name,
          subtitle: '',
          text: r.text,
          rating: r.rating,
          date: new Date(r.createdAt).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }));

        setReviews(showAll ? mapped : mapped.slice(0, 3));
      } catch (error) {
        console.error('Error loading reviews:', error);
      }
    }
    loadReviews();
  }, [showAll]);

  // Intersection Observer для запуска анимации при скролле к секции
  useEffect(() => {
    if (isSectionLoaded) return;

    const setup = () => {
      if (!sectionRef.current) return null;

      const checkVisibility = () => {
        const rect = sectionRef.current!.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      };

      if (checkVisibility()) {
        setIsSectionLoaded(true);
        return null;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setIsSectionLoaded(true);
        },
        { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
      );
      observer.observe(sectionRef.current);
      return () => { sectionRef.current && observer.unobserve(sectionRef.current); };
    };

    let off = setup();
    if (off) return off;
    const id = setTimeout(() => { off = setup(); }, 120);
    return () => { clearTimeout(id); off?.(); };
  }, [isSectionLoaded]);

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
    <section
      ref={sectionRef}
      className={`${styles.reviewsContainer} ${isSectionLoaded ? styles.sectionAnimated : ''} ${showAll ? styles.reviewsContainerPage : ''}`}
    >
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

      {!isMobile && !showAll && (
        <Link to='/reviews/' className={styles.allWrapper}>
          <p>ВСЕ ОТЗЫВЫ</p>
          <img src={ArrowToRight} alt='' />
        </Link>
      )}
    </section>
  );
};
