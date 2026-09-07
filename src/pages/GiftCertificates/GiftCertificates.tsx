import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import styles from './GiftCertificates.module.scss';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import {
  fetchGiftDenominations,
  type GiftDenomination,
} from '@/api/giftCertificatesApi';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';
import { SITE_GIFT_CERTIFICATES_HREF } from '@/config/siteNavLinks';
import { mapGiftDenomToBestSellerProduct } from '@/utils/giftDenomCart';
import { scrollPageToTopAfterLayout } from '@/utils/scrollPageToTop';
import type { BestSellersProduct } from '@/types/products';

const GiftCertificates: React.FC = () => {
  const [denoms, setDenoms] = useState<GiftDenomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [animated, setAnimated] = useState(false);

  useDocumentSeo({
    title: 'Подарочные сертификаты',
    description:
      'Купить подарочный сертификат Miraflores — идеальный подарок для ухода за кожей.',
    canonicalPath: SITE_GIFT_CERTIFICATES_HREF,
  });

  useLayoutEffect(() => {
    scrollPageToTopAfterLayout();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    void fetchGiftDenominations()
      .then((rows) => {
        if (cancelled) return;
        setDenoms(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setDenoms([]);
          setLoadError(true);
        }
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

  const products = useMemo<BestSellersProduct[]>(
    () => denoms.map(mapGiftDenomToBestSellerProduct),
    [denoms],
  );

  if (loading) {
    return (
      <div className={styles.loader}>
        <SpinnerLoader />
      </div>
    );
  }

  if (loadError || products.length === 0) {
    return (
      <section className={`${styles.faceContainer} ${animated ? styles.sectionAnimated : ''}`}>
        <h1 className={styles.title}>Подарочные сертификаты</h1>
        <section className={styles.noProductsWrapper}>
          <div className={styles.noProducts}>
            <p>
              {loadError
                ? 'Не удалось загрузить номиналы. Попробуйте позже или обратитесь в поддержку.'
                : 'Номиналы сертификатов пока недоступны. Загляните позже.'}
            </p>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className={`${styles.faceContainer} ${animated ? styles.sectionAnimated : ''}`}>
      <h1 className={styles.title}>Подарочные сертификаты</h1>
      <p className={styles.description}>
        Электронный подарочный сертификат Miraflores. Добавьте номинал в корзину
        и оформите как обычный товар — код придёт на email сразу после оплаты.
      </p>

      <div className={styles.grid}>
        {products.map((product) => (
          <BestSellerProductCard
            key={product.id}
            product={product}
            loading={false}
            fluid
          />
        ))}
      </div>
    </section>
  );
};

export default GiftCertificates;
