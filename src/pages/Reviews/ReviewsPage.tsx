import React, { useEffect, useState } from 'react';
import styles from './ReviewsPage.module.scss';
import { Review } from '@/components/take-test/reviews/review/Review';
import { getAllPublishedReviews } from '@/graphql/queries/reviewsAll.service';
import { ReviewModal } from '@/components/review-modal/ReviewModal';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';

interface ReviewData {
  images: string[];
  title: string;
  subtitle: string;
  text: string;
  rating: number;
  date: string;
}

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      try {
        setLoading(true);
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

        setReviews(mapped);
      } catch (error) {
        console.error('Error loading reviews:', error);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  return (
    <>
      <Header />
      <main className={styles.reviewsPage}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Отзывы</h1>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className={styles.createButton}
            >
              Оставить отзыв
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Загрузка отзывов...</div>
          ) : reviews.length > 0 ? (
            <div className={styles.reviewsList}>
              {reviews.map((review, index) => (
                <Review key={index} {...review} />
              ))}
            </div>
          ) : (
            <div className={styles.noReviews}>
              <p>Пока нет отзывов</p>
              <button 
                onClick={() => setIsModalOpen(true)} 
                className={styles.createButton}
              >
                Станьте первым, кто оставит отзыв
              </button>
            </div>
          )}
        </div>
      </main>
      {isModalOpen && (
        <ReviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      <Footer footerImage={footerImage} />
    </>
  );
};

export default ReviewsPage;

