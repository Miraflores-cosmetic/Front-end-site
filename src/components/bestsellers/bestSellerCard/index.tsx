import React, { useState, useCallback } from 'react';
import styles from './BestSellerCard.module.scss';
import { Link } from 'react-router-dom';
import { BestSellersProduct } from '@/types/products';
import { FavoriteButton } from '@/components/favorite-button/FavoriteButton';
import AddToBasket from '@/components/add-tobasket-button/AddToBasket';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';

export const BestSellerProductCard: React.FC<{ 
  product: BestSellersProduct; 
  loading: boolean;
  isDragging?: boolean;
  isDraggingRef?: React.MutableRefObject<boolean>;
}> = ({
  product,
  loading,
  isDragging = false,
  isDraggingRef
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldBlockClick, setShouldBlockClick] = useState(false);

  // Блокируем клик, если был драг
  React.useEffect(() => {
    if (isDragging) {
      setShouldBlockClick(true);
      // Разрешаем клик через задержку после окончания драга
      const timer = setTimeout(() => {
        setShouldBlockClick(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Также проверяем через ref для большей надежности
      const checkTimer = setInterval(() => {
        if (isDraggingRef?.current) {
          setShouldBlockClick(true);
        } else if (!isDragging) {
          setShouldBlockClick(false);
        }
      }, 50);
      return () => clearInterval(checkTimer);
    }
  }, [isDragging, isDraggingRef]);

  // Функция для проверки, нужно ли блокировать клик
  const shouldBlockNavigation = useCallback((e: React.MouseEvent) => {
    // Проверяем через ref (более надежно)
    if (isDraggingRef?.current) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
    // Проверяем через state
    if (isDragging || shouldBlockClick) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
    return false;
  }, [isDragging, shouldBlockClick, isDraggingRef]);
  const mainImage =
    (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) || product.thumbnail;
  
  const hoverImage = Array.isArray(product.images) && product.images.length > 1 
    ? product.images[1] 
    : null;
  
  const formattedPrice = Math.round(product.price).toLocaleString('ru-RU');
  const formattedOldPrice = product.oldPrice ? Math.round(product.oldPrice).toLocaleString('ru-RU') : null;

  const activeVariantId = product.id || (product.productVariants && product.productVariants.length > 0 
    ? product.productVariants[0].node.id 
    : null);
  
  // Получаем активный вариант для правильного размера
  const activeVariant = product.productVariants && product.productVariants.length > 0
    ? product.productVariants.find(v => v.node.id === product.id) || product.productVariants[0]
    : null;

  const getVolumeFromVariant = (variant: any): string => {
    if (!variant?.node?.attributes || !Array.isArray(variant.node.attributes)) {
      return variant?.node?.name || '';
    }
    const volumeAttr = variant.node.attributes.find((attr: any) => 
      attr.attribute?.slug === 'obem' || 
      attr.attribute?.slug === 'volume' ||
      attr.attribute?.name?.toLowerCase().includes('объем') ||
      attr.attribute?.name?.toLowerCase().includes('volume')
    );
    if (volumeAttr?.values?.[0]?.name) {
      return volumeAttr.values[0].name;
    } else if (volumeAttr?.values?.[0]?.plainText) {
      return volumeAttr.values[0].plainText;
    }
    return variant?.node?.name || '';
  };

  const volumes = product.productVariants && product.productVariants.length > 0
    ? product.productVariants.map(variant => getVolumeFromVariant(variant)).filter(v => v)
    : [];

  const getVolumeRange = (): string => {
    if (volumes.length === 0) return '';
    if (volumes.length === 1) return volumes[0];
    
    const volumeNumbers = volumes.map(vol => {
      const match = vol.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }).filter(num => num > 0);
    
    if (volumeNumbers.length === 0) {
      return `${volumes[0]}-${volumes[volumes.length - 1]}`;
    }
    
    const min = Math.min(...volumeNumbers);
    const max = Math.max(...volumeNumbers);
    
    const unitMatch = volumes[0].match(/\d+\s*([а-яa-z]+)/i);
    const unit = unitMatch ? unitMatch[1] : 'мл';
    
    if (min === max) {
      return volumes[0];
    }
    
    return `${min}-${max} ${unit}`;
  };

  const volumeRange = getVolumeRange();

  return (
    <div
      className={`${styles.productCard} ${styles.card}`}
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
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {product.discount && <span className={styles.discount}>-{product.discount}%</span>}

            {mainImage && (
              <Link 
                to={'/product/' + product.slug} 
                className={styles.imageLink}
                onClick={(e) => {
                  // Блокируем переход, если был драг
                  shouldBlockNavigation(e);
                }}
                onMouseDown={(e) => {
                  // Блокируем на mousedown тоже для большей надежности
                  if (isDraggingRef?.current || isDragging || shouldBlockClick) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <ImageWithFallback
                  src={mainImage}
                  alt={product.title}
                  className={`${styles.productImage} ${styles.mainImage} ${isHovered && hoverImage ? styles.hidden : ''}`}
                  placeholder="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='332' height='332'%3E%3Crect width='100%25' height='100%25' fill='%23F6F5EF'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236E6D67' font-family='Avenir Next' font-size='14'%3EИзображение%3C/text%3E%3C/svg%3E"
                />
                {hoverImage && (
                  <ImageWithFallback
                    src={hoverImage}
                    alt={product.title}
                    className={`${styles.productImage} ${styles.hoverImage} ${isHovered ? styles.visible : styles.hidden}`}
                    placeholder="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='332' height='332'%3E%3Crect width='100%25' height='100%25' fill='%23F6F5EF'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236E6D67' font-family='Avenir Next' font-size='14'%3EИзображение%3C/text%3E%3C/svg%3E"
                  />
                )}
              </Link>
            )}

            {product.productVariants && product.productVariants.length > 0 && (
              <div className={`${styles.sizeRow} ${isHovered ? styles.sizeRowHidden : ''}`}>
                {product.productVariants.map((variant, index) => {
                  const volume = getVolumeFromVariant(variant);
                  
                  return (
                    <button
                      key={variant.node.id || index}
                      className={
                        variant.node.id === product.id ? styles.sizePillActive : styles.sizePill
                      }
                    >
                      {volume || `${index + 1}`}
                    </button>
                  );
                })}
              </div>
            )}

            {isHovered && (
              <div className={styles.addToCardWrapper}>
                <AddToBasket
                  activeVariantId={activeVariantId}
                  title={product.title}
                  thumbnail={mainImage || ''}
                  price={product.price}
                  oldPrice={product.oldPrice}
                  discount={product.discount}
                  size={activeVariant ? getVolumeFromVariant(activeVariant) : (product.size || '')}
                  productId={product.id}
                />
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
                  // Блокируем переход, если был драг
                  shouldBlockNavigation(e);
                }}
                onMouseDown={(e) => {
                  // Блокируем на mousedown тоже для большей надежности
                  if (isDraggingRef?.current || isDragging || shouldBlockClick) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <p className={styles.title}>
                  {product.title}
                </p>
              </Link>
              <div className={styles.priceWrapper}>
                {formattedOldPrice && product.oldPrice && product.oldPrice > product.price && (
                  <span className={styles.oldPrice}>{formattedOldPrice}₽</span>
                )}
                <span className={styles.price}>{formattedPrice}₽</span>
              </div>
            </div>
            <p className={styles.desc}>{product.description}</p>
          </div>
        </>
      )}
    </div>
  );
};
