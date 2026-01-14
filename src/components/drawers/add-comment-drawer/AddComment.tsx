import React from 'react';
import styles from './AddComment.module.scss';

import { useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';

import CommentCart from './CommentCart';

const AddCommentDrawer: React.FC = () => {
  const dispatch = useDispatch();

  return (
    <div className={`${styles.drawer}`}>
      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <p className={styles.title}>ОСтавить отзыв</p>
          <p onClick={() => dispatch(closeDrawer())} className={styles.closeTxt}>
            Закрыть
          </p>
        </div>
        <div className={styles.listWrapper}>
          <CommentCart />
          <CommentCart />
          <CommentCart />
        </div>
      </div>
      <div className={styles.addWrapper} onClick={() => {}}>
        <button className={styles.addComment}>Оставить отзыв</button>
      </div>
    </div>
  );
};

export default AddCommentDrawer;
