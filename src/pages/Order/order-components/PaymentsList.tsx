import React from 'react';
import styles from '../left-part/OrderLeftPart.module.scss';

export interface PaymentImage {
  src: string;
  alt: string;
}

interface PaymentsListProps {
  paymentImages: PaymentImage[];
}

const PaymentsList: React.FC<PaymentsListProps> = ({ paymentImages }) => {
  return (
    <div className={styles.paymentImagesRow}>
      {paymentImages.map((item, index) => (
        <img key={index} src={item.src} alt={item.alt} className={styles.paymentImage} />
      ))}
    </div>
  );
};

export default PaymentsList;
