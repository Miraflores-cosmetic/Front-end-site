'use client';

import React, { useEffect, useState } from 'react';
import styles from './GiftCertificates.module.scss';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import AddToBasket from '@/components/add-tobasket-button/AddToBasket';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { getSingleProduct } from '@/graphql/queries/products.service';
import type { ProductDetailNode } from '@/graphql/types/core.types';

/** Slug товара «Подарочный сертификат». VITE_GIFT_CERTIFICATE_PRODUCT_SLUG или дефолт. */
export const GIFT_CERTIFICATE_PRODUCT_SLUG =
  import.meta.env.VITE_GIFT_CERTIFICATE_PRODUCT_SLUG || 'podarochnyj-sertifikat';

const formatPrice = (amount: number) => Math.round(amount).toLocaleString('ru-RU');

const GiftCertificates: React.FC = () => {
  const [product, setProduct] = useState<ProductDetailNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getSingleProduct(GIFT_CERTIFICATE_PRODUCT_SLUG)
      .then((row) => {
        if (!cancelled) setProduct(row);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className={styles.loader}>
        <SpinnerLoader />
      </div>
    );
  }

  const variants = product?.productVariants?.edges ?? [];

  if (!product || !variants.length) {
    return (
      <section className={`${styles.faceContainer} ${animated ? styles.sectionAnimated : ''}`}>
        <h1 className={styles.title}>Подарочные сертификаты</h1>
        <section className={styles.noProductsWrapper}>
          <div className={styles.noProducts}>
            <p>Сертификаты временно недоступны. Обратитесь в службу поддержки.</p>
          </div>
        </section>
      </section>
    );
  }

  const thumbnail = product.thumbnail?.url || product.media?.[0]?.url || '';
  const productName = product.name || 'Подарочный сертификат';
  const descriptionHtml =
    typeof product.description === 'string' && product.description.trim()
      ? editorJsToHtml(product.description)
      : '';

  return (
    <section className={`${styles.faceContainer} ${animated ? styles.sectionAnimated : ''}`}>
      <h1 className={styles.title}>{product.name || 'Подарочные сертификаты'}</h1>
      {descriptionHtml ? (
        <div
          className={styles.description}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : null}

      <section className={styles.wrapper}>
        {variants.map((edge) => {
          const node = edge.node;
          const price = node.pricing?.price?.gross?.amount ?? 0;
          const name = node.name || `${formatPrice(price)} ₽`;
          return (
            <article key={node.id} className={styles.card}>
              <div className={styles.imageBox}>
                <ImageWithFallback
                  src={thumbnail}
                  alt={productName}
                  className={styles.image}
                />
              </div>
              <div className={styles.info}>
                <p className={styles.cardTitle}>{name}</p>
                <p className={styles.cardPrice}>{formatPrice(price)} ₽</p>
                <AddToBasket
                  activeVariantId={node.id}
                  title={product.name}
                  thumbnail={thumbnail}
                  price={price}
                  oldPrice={node.pricing?.priceUndiscounted?.gross?.amount ?? null}
                  discount={null}
                  size={name}
                  slug={product.slug}
                  productId={String(product.id)}
                  variant="product"
                />
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
};

export default GiftCertificates;
