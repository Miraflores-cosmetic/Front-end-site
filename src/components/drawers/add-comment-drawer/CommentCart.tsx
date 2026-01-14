import React, { useState } from 'react';
import styles from './AddComment.module.scss';
import krem from '@/assets/images/krem.webp';

import star from '@/assets/icons/star.svg';
import emptyStar from '@/assets/icons/emptyStar.svg';
import sc1 from '@/assets/images/sc1.webp';
import sc2 from '@/assets/images/sc2.webp';
import scempty from '@/assets/images/scempty.webp';
import { TextField } from '@/components/text-field/TextField';

const CommentCart: React.FC = () => {
  const [comment, setComment] = useState('');

  const starsObj = {
    first: sc1,
    second: sc2,
    third: scempty,
    fourth: scempty
  };
  return (
    <article className={styles.commentCart}>
      <div className={styles.imgNameWrapper}>
        <div className={styles.imageWrapper}>
          <img src={krem} alt='krem' className={styles.image} />
        </div>
        <div className={styles.nameWrapper}>
          <p className={styles.title}>Цветочный мист с экстрактами розы</p>
          <p className={styles.size}>50 мл</p>
        </div>
      </div>
      <div className={styles.rateWrapper}>
        {Array(5)
          .fill(null)
          .map((_, i) => (
            <img key={i} src={i < 4 ? star : emptyStar} alt={`rate ${i + 1}`} />
          ))}
      </div>
      <div className={styles.inputWrapper}>
        {' '}
        <TextField
          placeholder='Как вам товар?'
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
      </div>
      <div className={styles.addPhotoWrapper}>
        <p className={styles.addPhotoTxt}>Добавьте фото</p>
        <div className={styles.imagesWrapper}>
          {' '}
          {Object.entries(starsObj).map(([key, src], i) => (
            <img key={key} src={src} alt={`image ${i + 1}`} />
          ))}
        </div>
        <p className={styles.descTxt}>Прикрепляя фотографии вы даете разрешение...</p>
      </div>
    </article>
  );
};

export default CommentCart;
