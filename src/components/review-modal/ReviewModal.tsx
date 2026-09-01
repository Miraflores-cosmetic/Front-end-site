import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReviewModal.module.scss';
import { createProductReview } from '@/graphql/queries/reviews.service';
import { ApiError, getAccessToken } from '@/api/apiClient';
import { useToast } from '@/components/toast/toast';
import { TextField } from '@/components/text-field/TextField';
import { focusablesIn, trapFocusKeydown } from '@/utils/focusTrap';
import trashIcon from '@/assets/icons/trash.svg';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_TEXT_LEN = 10;

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
  productName,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState<string>('');
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (preview1) URL.revokeObjectURL(preview1);
      if (preview2) URL.revokeObjectURL(preview2);
    };
  }, [preview1, preview2]);

  useEffect(() => {
    if (!isOpen) return;
    if (getAccessToken()) return;
    toast.error('Чтобы оставить отзыв, войдите в аккаунт');
    onClose();
    const next = window.location.pathname + window.location.search;
    navigate(`/sign-in?next=${encodeURIComponent(next)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gate once per open
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !getAccessToken()) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const root = dialogRef.current;
    const focusFirst = () => {
      const nodes = root ? focusablesIn(root) : [];
      (nodes[0] ?? root)?.focus();
    };
    const t = window.setTimeout(focusFirst, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (root) trapFocusKeydown(e, root);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !getAccessToken()) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error(
        'Пожалуйста, выберите товар для отзыва. Перейдите в каталог и выберите товар, затем нажмите «Оставить отзыв»',
      );
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Пожалуйста, выберите рейтинг от 1 до 5 звезд');
      return;
    }

    if (text.trim().length < MIN_TEXT_LEN) {
      toast.error(`Текст отзыва должен содержать минимум ${MIN_TEXT_LEN} символов`);
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
        image2,
      });

      if (result.imagesError) {
        toast.error(
          `Отзыв принят на модерацию, но фото не загрузились: ${result.imagesError}`,
        );
      } else {
        toast.success('Отзыв отправлен на модерацию. Спасибо!');
      }
      setRating(0);
      setText('');
      setImage1(null);
      setImage2(null);
      setPreview1(null);
      setPreview2(null);
      onClose();
    } catch (error: unknown) {
      console.error('Error creating review:', error);
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Ошибка при отправке отзыва';
      if (error instanceof ApiError && error.status === 401) {
        toast.error('Сессия истекла — войдите снова');
        onClose();
        navigate('/sign-in');
      } else if (
        typeof msg === 'string' &&
        (msg.includes('уже оставляли') || msg.includes('уже оставили'))
      ) {
        toast.error('Вы уже оставляли отзыв на этот товар');
        onClose();
      } else {
        toast.error(msg || 'Ошибка при отправке отзыва');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (index: 1 | 2, file: File | null) => {
    if (file && file.size > MAX_IMAGE_BYTES) {
      toast.error('Размер фото — максимум 5 МБ');
      return;
    }
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
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Оставить отзыв
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {!productId ? (
          <div className={styles.noProductMessage}>
            <p>Для оставления отзыва необходимо выбрать товар.</p>
            <p>
              Перейдите в каталог, выберите товар и нажмите «Оставить отзыв» на странице
              товара.
            </p>
          </div>
        ) : (
          productName && <div className={styles.productName}>{productName}</div>
        )}

        {productId && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.ratingSection}>
              <span className={styles.label} id={`${titleId}-rating`}>
                Оценка
              </span>
              <div className={styles.stars} role="group" aria-labelledby={`${titleId}-rating`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.star} ${rating >= star ? styles.active : ''}`}
                    onClick={() => setRating(star)}
                    aria-label={`${star} из 5`}
                    aria-pressed={rating >= star}
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
              />
              <div className={styles.charCount}>
                {text.length}/{MIN_TEXT_LEN} (минимум {MIN_TEXT_LEN} символов)
              </div>
            </div>

            <div className={styles.imagesSection}>
              <label className={styles.label}>Фотографии (до 2 штук, максимум 5 МБ каждая)</label>
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
                      {preview1 && (
                        <img src={preview1} alt="" className={styles.previewImage} />
                      )}
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{image1.name}</span>
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={() => handleImageChange(1, null)}
                          aria-label="Удалить фото 1"
                        >
                          <img src={trashIcon} alt="" />
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
                      {preview2 && (
                        <img src={preview2} alt="" className={styles.previewImage} />
                      )}
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{image2.name}</span>
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={() => handleImageChange(2, null)}
                          aria-label="Удалить фото 2"
                        >
                          <img src={trashIcon} alt="" />
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
                disabled={loading || !productId || rating === 0 || text.trim().length < MIN_TEXT_LEN}
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
