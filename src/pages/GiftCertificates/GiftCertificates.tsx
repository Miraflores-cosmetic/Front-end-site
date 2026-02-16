'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './GiftCertificates.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import { AppDispatch, RootState } from '@/store/store';
import { getProductBySlug } from '@/store/slices/productSlice';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import AddToBasket from '@/components/add-tobasket-button/AddToBasket';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';

/** Slug товара «Подарочный сертификат» в Saleor. Задаётся в .env как VITE_GIFT_CERTIFICATE_PRODUCT_SLUG или подставьте свой slug сюда. */
export const GIFT_CERTIFICATE_PRODUCT_SLUG =
  import.meta.env.VITE_GIFT_CERTIFICATE_PRODUCT_SLUG || 'podarochnyj-sertifikat';

const formatPrice = (amount: number) => Math.round(amount).toLocaleString('ru-RU');

const GiftCertificates: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { item, loading } = useSelector((state: RootState) => state.product);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    dispatch(getProductBySlug({ slug: GIFT_CERTIFICATE_PRODUCT_SLUG }));
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (loading || !item) {
    return (
      <>
        <Header />
        <div className={styles.loader}>
          <SpinnerLoader />
        </div>
        <Footer footerImage={footerImage} />
      </>
    );
  }

  if (!item.variants?.length) {
    return (
      <>
        <Header />
        <section className={`${styles.faceContainer} ${animated ? styles.sectionAnimated : ''}`}>
          <h1 className={styles.title}>Подарочные сертификаты</h1>
          <section className={styles.noProductsWrapper}>
            <div className={styles.noProducts}>
              <p>Сертификаты временно недоступны. Обратитесь в службу поддержки.</p>
            </div>
          </section>
        </section>
        <Footer footerImage={footerImage} />
      </>
    );
  }

  const thumbnail = item?.thumbnail || (item?.media?.[0] as any)?.url || '';
  const variants = item.variants || [];
  const productName = item.name || 'Подарочный сертификат';

  return (
    <>
      <Header />
      <section className={`${styles.faceContainer} ${animated ? styles.sectionAnimated : ''}`}>
        <h1 className={styles.title}>{item.name || 'Подарочные сертификаты'}</h1>
        {item.description && (
          <div
            className={styles.description}
            dangerouslySetInnerHTML={{
              __html:
                typeof item.description === 'string' && item.description.trim().startsWith('{')
                  ? (() => {
                      try {
                        return editorJsToHtml(JSON.parse(item.description));
                      } catch {
                        return item.description.replace(/\n/g, '<br>');
                      }
                    })()
                  : typeof item.description === 'string'
                    ? item.description.replace(/\n/g, '<br>')
                    : ''
            }}
          />
        )}

        <section className={styles.wrapper}>
          {variants.map((edge: any) => {
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
                    title={item.name}
                    thumbnail={thumbnail}
                    price={price}
                    oldPrice={node.pricing?.priceUndiscounted?.gross?.amount ?? null}
                    discount={null}
                    size={name}
                    productId={item.id as string}
                    variant="product"
                  />
                </div>
              </article>
            );
          })}
        </section>
      </section>
      <Footer footerImage={footerImage} />
    </>
  );
};

export default GiftCertificates;
