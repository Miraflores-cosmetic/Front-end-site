import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import styles from './DesktopMenuLayout.module.scss';
import centerImageMenu from '@/assets/images/centerImageMenu.png';
import { MenuNavSections } from './MenuNavSections';
import { ProductCard } from '@/components/product-card';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { fetchMenuFeatured } from '@/store/slices/menuFeaturedSlice';
import type { AppDispatch, RootState } from '@/store/store';
import type { BestSellersProduct } from '@/types/products';

function menuProductToCard(
  p: NonNullable<RootState['menuFeatured']['data']>['product'],
): BestSellersProduct | null {
  if (!p?.slug) return null;
  const images =
    p.imageUrls?.length > 0
      ? p.imageUrls
      : p.imageUrl
        ? [p.imageUrl]
        : [];
  const variantId = p.variantId?.trim() || p.id;
  return {
    id: variantId,
    productId: p.id,
    size: '',
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

export function DesktopMenuLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { data, status } = useSelector((s: RootState) => s.menuFeatured);

  useEffect(() => {
    dispatch(fetchMenuFeatured());
  }, [dispatch]);

  const product = useMemo(
    () => menuProductToCard(data?.product ?? null),
    [data],
  );

  const annotation = data?.annotationText?.trim() || '';
  const showSkeleton = status === 'loading' && !product;
  const showEmpty = status !== 'loading' && status !== 'revalidating' && !product;

  const close = () => dispatch(closeDrawer());

  return (
    <div className={styles.layout}>
      <nav className={styles.nav} aria-label="Разделы сайта">
        <MenuNavSections />
      </nav>

      <figure className={styles.quizBridge}>
        <img
          src={centerImageMenu}
          alt=""
          width={188}
          height={216}
          className={styles.quizImage}
          aria-hidden="true"
        />
        <figcaption className={styles.quizCaption}>
          <button
            type="button"
            className={styles.quizButton}
            onClick={() => {
              navigate('/quiz');
              close();
            }}
          >
            Подобрать уход
          </button>
        </figcaption>
      </figure>

      <aside className={styles.right} aria-label="Рекомендация">
        <button type="button" className={styles.close} aria-label="Закрыть меню" onClick={close}>
          Закрыть
        </button>

        <div className={styles.cardStage}>
          {annotation ? (
            <div className={styles.annotationBlock}>
              <p className={styles.annotation}>{annotation}</p>
            </div>
          ) : null}

          <div className={styles.cardSlot}>
            {showSkeleton ? (
              <ProductCard
                product={{
                  id: 'skeleton',
                  size: '',
                  title: '',
                  description: '',
                  slug: '',
                  price: 0,
                  images: [],
                  thumbnail: '',
                  productVariants: [],
                  collections: { id: '', name: '', slug: '' },
                }}
                loading
                fluid
              />
            ) : product ? (
              <div className={styles.cardWrap}>
                <ProductCard product={product} loading={false} fluid onNavigate={close} />
              </div>
            ) : showEmpty ? (
              <p className={styles.status} role="status">
                Товар не выбран в настройках меню
              </p>
            ) : (
              <ProductCard
                product={{
                  id: 'skeleton',
                  size: '',
                  title: '',
                  description: '',
                  slug: '',
                  price: 0,
                  images: [],
                  thumbnail: '',
                  productVariants: [],
                  collections: { id: '', name: '', slug: '' },
                }}
                loading
                fluid
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
