import React, { useEffect, useState } from 'react';
import styles from './Sets.module.scss';
import creamImage from '@/assets/images/Cream.png';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import {
  getHomepageSets,
  type HomepageSetItem,
  type HomepageSetProduct,
} from '@/api/settingsApi';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { ProductCard } from '@/components/product-card';
import type { BestSellersProduct } from '@/types/products';
import MoreLink, { SectionTitleRow } from '@/components/MoreLink/MoreLink';
import { HomeSection } from '@/components/home-section/HomeSection';

const INTRO = (
  <>
    Наши продукты прекрасно сочетаются между собой, усиливая действие друг друга. Чтобы вам было
    удобно, мы собрали полные наборы ухода, учитывающие разные запросы кожи. В каждом наборе вы
    найдёте полноступенчатый уход от очищения до финального этапа защиты и восстановления.
    <span className={styles.leftTitleParagraph}>
      Покупать наборами не только удобно, но и выгодно: все товары в данной категории уже идут со
      скидкой, так что вы получаете полноценный ритуал ухода по более привлекательной цене.
    </span>
  </>
);

function homepageProductToCard(p: HomepageSetProduct): BestSellersProduct {
  const images =
    p.imageUrls?.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
  const variantId = p.variantId?.trim() || p.id;
  return {
    id: variantId,
    productId: p.id,
    size: p.variantName || '',
    title: p.name,
    description: p.shortDescription || '',
    slug: p.slug,
    price: p.price,
    oldPrice: p.oldPrice ?? undefined,
    discount: p.discountPercent ?? undefined,
    images,
    thumbnail: images[0] || '',
    productVariants: [],
    collections: { id: '', name: '', slug: '' },
  };
}

function SetsSkeleton({ showCircle }: { showCircle: boolean }) {
  return (
    <div className={styles.setsWrapper} aria-hidden>
      <div className={styles.left}>
        <div className={styles.skeletonText} />
        <div className={styles.skeletonTextShort} />
      </div>
      <div className={styles.center}>
        <div className={styles.skeletonCard} />
      </div>
      {showCircle ? (
        <div className={styles.right}>
          <div className={styles.skeletonCircle} />
        </div>
      ) : null}
    </div>
  );
}

export const Sets: React.FC = () => {
  const isMobile = useScreenMatch();
  const [item, setItem] = useState<HomepageSetItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const items = await getHomepageSets();
        if (!cancelled) setItem(items[0] ?? null);
      } catch (err) {
        console.error('[Sets] homepage-sets failed', err);
        if (!cancelled) setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && !item?.product?.slug) return null;

  const product = item?.product ? homepageProductToCard(item.product) : null;
  const setImage = item?.imageUrl || null;

  return (
    <HomeSection className={styles.setsContainer} aria-labelledby="homepage-sets-title">
      <SectionTitleRow className={styles.titleRow}>
        <h2 id="homepage-sets-title" className={styles.title}>
          Наборы
        </h2>
        <MoreLink to="/catalog/nabory" />
      </SectionTitleRow>

      {loading || !product ? (
        <SetsSkeleton showCircle={!isMobile} />
      ) : (
        <div className={styles.setsWrapper}>
          <div className={styles.left}>
            <p className={styles.leftTitle}>{INTRO}</p>
          </div>

          <div className={styles.center}>
            <ProductCard product={product} loading={false} />
          </div>

          {!isMobile ? (
            <div className={styles.right}>
              <div className={styles.rightWrapper}>
                {setImage ? (
                  <ImageWithFallback src={setImage} alt="" className={styles.setImage} />
                ) : (
                  <img src={creamImage} alt="" aria-hidden />
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </HomeSection>
  );
};
