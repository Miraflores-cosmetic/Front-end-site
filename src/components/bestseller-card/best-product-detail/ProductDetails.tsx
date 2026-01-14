import React from 'react';
import styles from './ProductDetails.module.scss';

export interface DetailItem {
  label: string;
  value: string;
}

interface ProductDetailsProps {
  title?: string;
  details: DetailItem[];
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  title = 'Подробные характеристики',
  details
}) => {
  return (
    <section className={styles.wrapper}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {details.map((item, idx) => (
          <li key={idx} className={styles.item}>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.dots}></span>
            <span className={styles.value}>{item.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ProductDetails;
