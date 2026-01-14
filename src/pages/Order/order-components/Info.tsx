import React from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import userImage from '@/assets/images/userImage.webp';

const InfoContent = () => {
  return (
    <section className={styles.infoWrapper}>
      <div className={styles.userWrapper}>
        <img className={styles.userImage} src={userImage} alt='user image' />
        <div className={styles.userInfo}>
          <p className={styles.userName}>Дмитрий Патрацкий</p>
          <p className={styles.userRole}>CEO</p>
        </div>
      </div>
      <div className={styles.textsWrapper}>
        <p className={styles.text}>
          Многие наши товары изготавливаются непосредственно после заказа, поэтому срок от приёма
          заказа до его отправки такого заказа составляет <span>3-5 рабочих дня</span> после 100%
          оплаты.
        </p>
        <p className={styles.text}>
          После обработки заказа нашими операторами, информация о заказе будет отправлена на e-mail,
          указанный при оформлении заказа
        </p>
      </div>
    </section>
  );
};

export default InfoContent;
