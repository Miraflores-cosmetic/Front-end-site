import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './BestSellerCard.module.scss';
import { BestSellersProduct } from '@/types/products';
import { FavoriteButton } from '@/components/favorite-button/FavoriteButton';
import AddToBasket from '@/components/add-tobasket-button/AddToBasket';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { isVariantOutOfStock } from '@/utils/stock';
import { sanitizeProductCardDescription } from '@/utils/productCardDescription';
import {
  glueRussianPrepositions,
  glueRussianPrepositionsInHtml,
} from '@/utils/glueRussianPrepositions';
import { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';
import type { RootState } from '@/store/store';

const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='332' height='332'%3E%3Crect width='100%25' height='100%25' fill='%23F6F5EF'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236E6D67' font-family='Avenir Next' font-size='14'%3EИзображение%3C/text%3E%3C/svg%3E";

const renderCardDescription = (description?: string | null) => {
  const normalized = sanitizeProductCardDescription(description, { preserveHtml: true });
  if (!normalized) return null;
  const glued = glueRussianPrepositionsInHtml(normalized);
  if (/<[^>]+>/.test(glued)) {
    return (
      <p
        className={styles.desc}
        dangerouslySetInnerHTML={{ __html: glued }}
      />
    );
  }
  return <p className={styles.desc}>{glued}</p>;
};

function normalizeGallery(product: BestSellersProduct): string[] {
  const fromImages = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : typeof product.images === 'string' && product.images
      ? [product.images]
      : [];
  if (fromImages.length > 0) return fromImages;
  return product.thumbnail ? [product.thumbnail] : [];
}

/** Mobile: объём / одна строка описания. */
function mobileCardSubtitle(product: BestSellersProduct): string {
  const size = product.size?.trim();
  if (size) return glueRussianPrepositions(size);
  return glueRussianPrepositions(
    sanitizeProductCardDescription(product.description, { preserveHtml: false }),
  );
}

type BestSellerProductCardProps = {
  product: BestSellersProduct;
  loading: boolean;
  fluid?: boolean;
  compact?: boolean;
  isDragging?: boolean;
  isDraggingRef?: React.MutableRefObject<boolean>;
  onNavigate?: () => void;
};

const BestSellerProductCardInner: React.FC<BestSellerProductCardProps> = ({
  product,
  loading,
  fluid = false,
  compact = false,
  isDragging = false,
  isDraggingRef,
  onNavigate,
}) => {
  /** Sync with SCSS `@media (max-width: $viewport-mobile-max)`. */
  const isMobile = useScreenMatch();
  const [shouldBlockClick, setShouldBlockClick] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [mediaHovered, setMediaHovered] = useState(false);
  const [unlockedThrough, setUnlockedThrough] = useState(0);
  const scrubMovedRef = useRef(false);
  const galleryAxisRef = useRef<'x' | 'y' | null>(null);
  const galleryPointerIdRef = useRef<number | null>(null);

  const gallery = useMemo(() => normalizeGallery(product), [product]);
  const galleryKey = gallery.join('\0');
  const hasGallery = gallery.length > 1;
  const mainImage = gallery[0] || '';
  const mobileSubtitle = useMemo(
    () => (isMobile ? mobileCardSubtitle(product) : ''),
    [isMobile, product],
  );

  const activeVariantId =
    product.id ||
    (product.productVariants && product.productVariants.length > 0
      ? product.productVariants[0].node.id
      : null);

  /** Примитив — карточка ре-рендерится только при смене qty своего variant. */
  const cartQty = useSelector((state: RootState) => {
    if (!activeVariantId) return 0;
    return (
      state.checkout.lines.find((item) => item.variantId === activeVariantId)?.quantity ?? 0
    );
  });
  const inCart = cartQty > 0;

  useEffect(() => {
    setGalleryIndex(0);
    setScrubbing(false);
    setUnlockedThrough(0);
  }, [galleryKey]);

  useEffect(() => {
    if (isDragging) {
      setShouldBlockClick(true);
      const timer = setTimeout(() => setShouldBlockClick(false), 500);
      return () => clearTimeout(timer);
    }
    const checkTimer = setInterval(() => {
      if (isDraggingRef?.current) {
        setShouldBlockClick(true);
      } else if (!isDragging) {
        setShouldBlockClick(false);
      }
    }, 50);
    return () => clearInterval(checkTimer);
  }, [isDragging, isDraggingRef]);

  const shouldBlockNavigation = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingRef?.current || isDragging || shouldBlockClick) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
      return false;
    },
    [isDragging, shouldBlockClick, isDraggingRef],
  );

  const scrubFromClientX = useCallback(
    (clientX: number, el: HTMLElement) => {
      if (gallery.length <= 1) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = Math.min(gallery.length - 1, Math.floor(ratio * gallery.length));
      setGalleryIndex(next);
      setUnlockedThrough((prev) => Math.max(prev, next));
    },
    [gallery.length],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hasGallery) return;

      if (isMobile) {
        if (galleryPointerIdRef.current !== e.pointerId) return;
        const startX = (e.currentTarget as HTMLElement).dataset.galleryStartX;
        const startY = (e.currentTarget as HTMLElement).dataset.galleryStartY;
        if (startX == null || startY == null) return;
        const dx = e.clientX - Number(startX);
        const dy = e.clientY - Number(startY);

        if (!galleryAxisRef.current) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          galleryAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (galleryAxisRef.current === 'x') {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }
        }

        if (galleryAxisRef.current !== 'x') return;
        e.stopPropagation();
        e.preventDefault();
        scrubMovedRef.current = true;
        setScrubbing(true);
        scrubFromClientX(e.clientX, e.currentTarget);
        return;
      }

      if (e.pointerType !== 'mouse' && e.buttons === 0) return;
      if (e.pointerType !== 'mouse') scrubMovedRef.current = true;
      setScrubbing(true);
      scrubFromClientX(e.clientX, e.currentTarget);
    },
    [hasGallery, isMobile, scrubFromClientX],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hasGallery) return;

      if (isMobile) {
        galleryPointerIdRef.current = e.pointerId;
        galleryAxisRef.current = null;
        scrubMovedRef.current = false;
        e.currentTarget.dataset.galleryStartX = String(e.clientX);
        e.currentTarget.dataset.galleryStartY = String(e.clientY);
        return;
      }

      scrubMovedRef.current = false;
      if (e.pointerType !== 'mouse') {
        setScrubbing(true);
        scrubFromClientX(e.clientX, e.currentTarget);
      }
    },
    [hasGallery, isMobile, scrubFromClientX],
  );

  const endScrub = useCallback(() => {
    if (isMobile) {
      galleryPointerIdRef.current = null;
      galleryAxisRef.current = null;
      setScrubbing(false);
      return;
    }
    setScrubbing(false);
    setGalleryIndex(0);
  }, [isMobile]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isMobile) {
        if (galleryPointerIdRef.current === e.pointerId) {
          galleryPointerIdRef.current = null;
          galleryAxisRef.current = null;
        }
        setScrubbing(false);
        return;
      }
      setScrubbing(false);
    },
    [isMobile],
  );

  const onMediaClick = (e: React.MouseEvent) => {
    if (scrubMovedRef.current) {
      e.preventDefault();
      scrubMovedRef.current = false;
      return;
    }
    if (shouldBlockNavigation(e)) return;
    onNavigate?.();
  };

  const formattedPrice = Math.round(product.price).toLocaleString('ru-RU');
  const formattedOldPrice = product.oldPrice
    ? Math.round(product.oldPrice).toLocaleString('ru-RU')
    : null;

  const activeVariant =
    product.productVariants && product.productVariants.length > 0
      ? product.productVariants.find((v) => v.node.id === product.id) ||
        product.productVariants[0]
      : null;

  const quantityLimitForCard =
    activeVariant?.node?.quantityLimitPerCustomer ?? product.quantityLimitPerCustomer ?? null;

  const stockNode = activeVariant?.node as
    | { quantityAvailable?: number | null; trackInventory?: boolean | null }
    | undefined;
  const outOfStock = isVariantOutOfStock({
    trackInventory: stockNode?.trackInventory ?? product.trackInventory,
    quantityAvailable: stockNode?.quantityAvailable ?? product.quantityAvailable,
  });

  const productTypeAttr = product.attributes?.find(
    (a: any) =>
      (a.attribute?.slug || '').toLowerCase() === 'product_type' ||
      (a.attribute?.slug || '').toLowerCase() === 'tip-produkta',
  );
  const productTypeFromAttr = (
    productTypeAttr?.values?.[0]?.name ||
    productTypeAttr?.values?.[0]?.plainText ||
    ''
  )
    .trim()
    .toUpperCase();
  const productTypeFromProduct = (product.productType?.name || '').trim().toUpperCase();
  const typeStr = productTypeFromAttr || productTypeFromProduct;
  const isGiftCertificates =
    typeStr === 'ПОДАРОЧНЫЕ СЕРТИФИКАТЫ' ||
    (typeStr.includes('ПОДАРОЧН') && typeStr.includes('СЕРТИФИКАТ'));

  const showDesktopAtc = !isMobile && (mediaHovered || inCart);
  const hasSellablePrice = Number(product.price) > 0;

  const addToBasketProps = {
    defaultText: outOfStock ? 'НЕТ В НАЛИЧИИ' : 'В КОРЗИНУ',
    hoverText: outOfStock ? 'НЕТ В НАЛИЧИИ' : 'В КОРЗИНУ',
    activeVariantId,
    title: product.title,
    thumbnail: mainImage || '',
    price: product.price,
    oldPrice: product.oldPrice,
    discount: product.discount,
    size: activeVariant ? getVolumeFromVariant(activeVariant) : product.size || '',
    slug: product.slug,
    productId: product.id,
    quantityLimitPerCustomer: quantityLimitForCard,
    quantityAvailable: stockNode?.quantityAvailable ?? product.quantityAvailable ?? null,
    trackInventory: stockNode?.trackInventory ?? product.trackInventory ?? null,
    disabled: outOfStock,
  };

  return (
    <div
      className={[
        styles.productCard,
        styles.card,
        fluid ? styles.fluid : '',
        compact ? styles.compact : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading && (
        <div className={styles.skeleton} aria-hidden="true">
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonInfo}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
            <div className={styles.skeletonPrice} />
          </div>
        </div>
      )}
      {!loading && (
        <>
          <div
            className={styles.imageBox}
            data-gallery={hasGallery || undefined}
            data-scrubbing={scrubbing || undefined}
            data-in-cart={inCart || undefined}
            onMouseEnter={() => {
              if (!isMobile) setMediaHovered(true);
            }}
            onMouseLeave={() => {
              if (!isMobile) setMediaHovered(false);
            }}
            onPointerDown={hasGallery ? onPointerDown : undefined}
            onPointerMove={hasGallery ? onPointerMove : undefined}
            onPointerLeave={hasGallery ? endScrub : undefined}
            onPointerCancel={hasGallery ? endScrub : undefined}
            onPointerUp={hasGallery ? onPointerUp : undefined}
          >
            {isMobile && activeVariantId ? (
              <FavoriteButton productId={activeVariantId} />
            ) : null}

            {product.discount && !outOfStock && (
              <span className={styles.discount}>-{product.discount}%</span>
            )}

            {gallery.length > 0 && (
              <Link
                to={'/product/' + product.slug}
                className={styles.imageLink}
                aria-label={product.title}
                onClick={onMediaClick}
                onMouseDown={(e) => {
                  if (isDraggingRef?.current || isDragging || shouldBlockClick) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {gallery.map((url, i) => {
                  if (i > unlockedThrough && i !== galleryIndex) return null;
                  const isActive = i === galleryIndex;
                  const layerClass = !hasGallery
                    ? styles.galleryImageSolo
                    : isActive
                      ? styles.galleryImageActive
                      : styles.galleryImageIdle;
                  return (
                    <ImageWithFallback
                      key={`${url}-${i}`}
                      src={url}
                      alt={isActive ? product.title : ''}
                      className={`${styles.productImage} ${layerClass}`}
                      placeholder={IMAGE_PLACEHOLDER}
                    />
                  );
                })}
              </Link>
            )}

            {hasGallery ? (
              <div
                className={styles.gallerySegments}
                role={isMobile ? 'tablist' : undefined}
                aria-label={isMobile ? 'Фото товара' : undefined}
                aria-hidden={isMobile ? undefined : true}
              >
                {gallery.map((_, i) =>
                  isMobile ? (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === galleryIndex}
                      aria-label={`Фото ${i + 1}`}
                      className={styles.gallerySegment}
                      data-active={i === galleryIndex || undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setGalleryIndex(i);
                        setUnlockedThrough((prev) => Math.max(prev, i));
                      }}
                    />
                  ) : (
                    <span
                      key={i}
                      className={styles.gallerySegment}
                      data-active={i === galleryIndex || undefined}
                    />
                  ),
                )}
              </div>
            ) : null}

            {!isMobile &&
              product.productVariants &&
              product.productVariants.length > 0 &&
              !isGiftCertificates && (
                <div
                  className={`${styles.sizeRow} ${showDesktopAtc ? styles.sizeRowHidden : ''}`}
                >
                  {product.productVariants.map((variant, index) => {
                    const volume = getVolumeFromVariant(variant);
                    return (
                      <button
                        key={variant.node.id || index}
                        type="button"
                        className={
                          variant.node.id === product.id
                            ? styles.sizePillActive
                            : styles.sizePill
                        }
                      >
                        {volume || `${index + 1}`}
                      </button>
                    );
                  })}
                </div>
              )}

            {hasSellablePrice && !isMobile && (
              <div
                className={`${styles.addToCardWrapper} ${showDesktopAtc ? '' : styles.addToCardHidden}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <AddToBasket {...addToBasketProps} />
              </div>
            )}
          </div>

          <div className={styles.info}>
            <div className={styles.titleRow}>
              <Link
                to={'/product/' + product.slug}
                className={styles.titleLink}
                title={product.title}
                onClick={(e) => {
                  if (shouldBlockNavigation(e)) return;
                  onNavigate?.();
                }}
                onMouseDown={(e) => {
                  if (isDraggingRef?.current || isDragging || shouldBlockClick) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <p className={styles.title}>
                  {glueRussianPrepositions(product.title)}
                </p>
              </Link>
              <div className={styles.priceWrapper}>
                {hasSellablePrice ? (
                  <>
                    <span className={styles.price}>{formattedPrice}₽</span>
                    {formattedOldPrice &&
                      product.oldPrice &&
                      product.oldPrice > product.price && (
                        <span className={styles.oldPrice}>{formattedOldPrice}₽</span>
                      )}
                  </>
                ) : (
                  <span className={styles.priceMuted}>цена в карточке</span>
                )}
              </div>
            </div>
            {isMobile ? (
              <>
                {mobileSubtitle ? (
                  <p className={styles.subtitle}>{mobileSubtitle}</p>
                ) : null}
                {hasSellablePrice ? (
                  <AddToBasket {...addToBasketProps} variant="card" />
                ) : (
                  <Link
                    to={'/product/' + product.slug}
                    className={styles.openProductLink}
                    onClick={(e) => {
                      if (shouldBlockNavigation(e)) return;
                      onNavigate?.();
                    }}
                  >
                    Смотреть
                  </Link>
                )}
              </>
            ) : (
              renderCardDescription(product.description)
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const BestSellerProductCard = React.memo(BestSellerProductCardInner);

/** Основная карточка товара (каталог, лента, избранное, квиз). */
export const ProductCard = BestSellerProductCard;
