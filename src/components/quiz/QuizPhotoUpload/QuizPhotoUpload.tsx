import React, { useRef } from 'react';
import { Button } from '@/components/button/Button';
import { X } from 'lucide-react';
import styles from './QuizPhotoUpload.module.scss';

const MAX_PHOTOS = 3;

interface QuizPhotoUploadProps {
  photos: File[];
  onChange: (photos: File[]) => void;
  onNext: () => void;
}

function getHint(count: number): string {
  if (count === 0) return 'Можно загрузить до 3 фото';
  if (count === 1) return 'Можно добавить ещё 2';
  if (count === 2) return 'Можно добавить ещё 1';
  return 'Максимум достигнут';
}

export const QuizPhotoUpload: React.FC<QuizPhotoUploadProps> = ({
  photos,
  onChange,
  onNext,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);
    onChange([...photos, ...toAdd]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.previewGrid}>
        {photos.map((file, index) => (
          <div key={`${file.name}-${index}`} className={styles.preview}>
            <img src={URL.createObjectURL(file)} alt={`Фото ${index + 1}`} />
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => removePhoto(index)}
              aria-label="Удалить фото"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            className={styles.addButton}
            onClick={() => inputRef.current?.click()}
          >
            <span>+</span>
            <span>Добавить</span>
          </button>
        )}
      </div>

      <p className={styles.hint}>{getHint(photos.length)}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      <Button text="Далее" onClick={onNext} />
    </div>
  );
};
