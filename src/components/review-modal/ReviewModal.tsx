import React, { useState, useEffect } from 'react';
import styles from './ReviewModal.module.scss';
import { createProductReview } from '@/graphql/queries/reviews.service';
import { useToast } from '@/components/toast/toast';
import { TextField } from '@/components/text-field/TextField';
import trashIcon from '@/assets/icons/trash.svg';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  orderId?: string;
  productName?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  productId,
  orderId,
  productName
}) => {
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState<string>('');
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    return () => {
      if (preview1) URL.revokeObjectURL(preview1);
      if (preview2) URL.revokeObjectURL(preview2);
    };
  }, [preview1, preview2]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error('Пожалуйста, выберите товар для отзыва. Перейдите в каталог и выберите товар, затем нажмите "Оставить отзыв"');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Пожалуйста, выберите рейтинг от 1 до 5 звезд');
      return;
    }

    if (text.trim().length < 10) {
      toast.error('Текст отзыва должен содержать минимум 10 символов');
      return;
    }

    setLoading(true);
    try {
      const result = await createProductReview({
        product: productId,
        order: orderId,
        rating,
        text: text.trim(),
        image1,
        image2
      });

      if (result.productReviewCreate.errors && result.productReviewCreate.errors.length > 0) {
        const errors = result.productReviewCreate.errors;
        const isDuplicate = errors.some(
          (e: any) => e.code === 'DUPLICATE_REVIEW' || e.message.includes('Вы уже оставили отзыв')
        );

        if (isDuplicate) {
          toast.error('Вы уже оставили отзыв на этот товар ранее.');
          // Optionally close modal since they can't review again
          onClose();
        } else {
          const errorMessage = errors.map((e: any) => e.message).join(', ');
          toast.error(errorMessage);
        }
      } else {
        toast.success('Отзыв отправлен на модерацию. Спасибо!');
        // Сброс формы
        setRating(0);
        setText('');
        setImage1(null);
        setImage2(null);
        setPreview1(null);
        setPreview2(null);
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating review:', error);
      toast.error(error?.message || 'Ошибка при отправке отзыва');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (index: 1 | 2, file: File | null) => {
    if (index === 1) {
      if (preview1) URL.revokeObjectURL(preview1);
      setImage1(file);
      setPreview1(file ? URL.createObjectURL(file) : null);
    } else {
      if (preview2) URL.revokeObjectURL(preview2);
      setImage2(file);
      setPreview2(file ? URL.createObjectURL(file) : null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Оставить отзыв</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {!productId ? (
          <div className={styles.noProductMessage}>
            <p>Для оставления отзыва необходимо выбрать товар.</p>
            <p>Перейдите в каталог, выберите товар и нажмите "Оставить отзыв" на странице товара.</p>
          </div>
        ) : (
          productName && (
            <div className={styles.productName}>
              {productName}
            </div>
          )
        )}

        {productId && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.ratingSection}>
              <label className={styles.label}>Оценка</label>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.star} ${rating >= star ? styles.active : ''}`}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.textSection}>
              <TextField
                label="Текст отзыва"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Расскажите о вашем опыте использования товара..."
              />
              <div className={styles.charCount}>
                {text.length}/10 (минимум 10 символов)
              </div>
            </div>

            <div className={styles.imagesSection}>
              <label className={styles.label}>Фотографии (до 2 штук, максимум 5MB каждая)</label>
              <div className={styles.imageInputs}>
                <div className={styles.imageInputWrapper}>
                  {!image1 ? (
                    <label className={styles.fileLabel}>
                      Выбрать фото 1
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(1, e.target.files?.[0] || null)}
                        className={styles.fileInput}
                      />
                    </label>
                  ) : (
                    <div className={styles.previewWrapper}>
                      {preview1 && <img src={preview1} alt="Preview 1" className={styles.previewImage} />}
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{image1.name}</span>
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={() => handleImageChange(1, null)}
                        >
                          <img src={trashIcon} alt="Удалить" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.imageInputWrapper}>
                  {!image2 ? (
                    <label className={styles.fileLabel}>
                      Выбрать фото 2
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(2, e.target.files?.[0] || null)}
                        className={styles.fileInput}
                      />
                    </label>
                  ) : (
                    <div className={styles.previewWrapper}>
                      {preview2 && <img src={preview2} alt="Preview 2" className={styles.previewImage} />}
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{image2.name}</span>
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={() => handleImageChange(2, null)}
                        >
                          <img src={trashIcon} alt="Удалить" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading || !productId || rating === 0 || text.trim().length < 10}
              >
                Отправить
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={loading}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
