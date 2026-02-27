'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from '../Product.module.scss';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import StarRating from '@/components/rating/StarRating';
import SizeTabs from '@/components/size-tabs/SizeTabs';
import check from '@/assets/icons/tick-circle.svg';
import Etaps, { Etap } from '@/components/etpas/Etaps';
import AddToCartButton from '@/components/add-tobasket-button/AddToBasket';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import BestSellerTabs from '@/components/bestseller-card/bestseller-tabs/BestSellerTabs';
import Description from '@/components/bestseller-card/bestseller-product-desription/Description';
import BestSellerEtaps, {
  BestSellerEtap
} from '@/components/bestseller-card/bestseller-etaps/BestsellerEtaps';

import { useScreenMatch } from '@/hooks/useScreenMatch';
import slide3 from '@/assets/images/item-photo.jpg';
import HeroSlider from '@/components/HeroSlider/HeroSlider';
import { ReviewModal } from '@/components/review-modal/ReviewModal';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Product } from '@/types/types';
import { getSingleProduct } from '@/graphql/queries/products.service';
import { generateBestsellerTabsOptions } from '@/utils/tabsGenerator';
import { editorJsToHtml } from '@/utils/editorJsParser';

import { getProductBySlug } from '@/store/slices/productSlice';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';

const LazyComponent: React.FC = () => {
  const { item, activeVariantId, loading } = useSelector((state: RootState) => state.product);
  const { slug } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(getProductBySlug({ slug: slug ?? '' }));
  }, [slug]);

  const navigate = useNavigate();
  const [activeSize, setActiveSize] = useState(null);
  const [actualProduct, setActualProduct] = useState<Product | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    getSingleProduct(slug || '')
      .then(res => {
        console.log("*******")
        console.log("getSingleProduct")
        console.log(res);
      })
      .catch(err => {
        console.log(err?.message);
      });
  }, [slug]);

  useEffect(()=>{
    console.log("*******")
    console.log("myItem")
    console.log(item);
  },[item])

  const getCurrentProductEtap = (): string | null => {
    if (!item?.attributes) return null;
    const careStageAttr = item.attributes.find((attr: any) => attr.attribute?.slug === 'care_stage');
    if (!careStageAttr?.values || careStageAttr.values.length === 0) return null;
    
    const value = careStageAttr.values[0];
    const slug = (value.slug || '').toLowerCase();
    const name = (value.name || '').toLowerCase();
    const plainText = (value.plainText || '').toLowerCase();
    
    // Нормализуем реальные значения из БД в стандартные этапы
    // Сначала проверяем slug - нормализуем реальные значения из БД
    if (slug) {
      // Реальные slug из БД: ochishchenie-etap-1, pitanie-i-uvlazhnenie-etap-31, sos-ukhod-etap-30
      if (slug.includes('etap-1') || slug.includes('ochishchenie') || slug === 'etap-1') {
        return 'etap-1';
      }
      if (slug.includes('etap-2') || slug.includes('tonizatsiia') || slug === 'etap-2') {
        return 'etap-2';
      }
      if (slug.includes('etap-31') || slug.includes('etap-3-1') || slug.includes('etap-3.1') || slug === 'etap-3-1') {
        return 'etap-3-1';
      }
      if (slug.includes('etap-3') || slug.includes('etap-30') || slug.includes('pitanie') || slug.includes('uvlazhnenie') || slug === 'etap-3') {
        return 'etap-3';
      }
    }
    
    // Затем проверяем name
    if (name) {
      if (name.includes('3.1') || name.includes('3-1') || name.includes('etap-3-1') || name.includes('etap-31')) {
        return 'etap-3-1';
      }
      if ((name.includes('питание') || name.includes('увлажнение') || name.includes('этап 3') || name.includes('etap-3')) && 
          !name.includes('3.1') && !name.includes('3-1')) {
        return 'etap-3';
      }
      if (name.includes('очищение') || name.includes('этап 1') || name.includes('etap-1')) {
        return 'etap-1';
      }
      if (name.includes('тонизация') || name.includes('этап 2') || name.includes('etap-2')) {
        return 'etap-2';
      }
    }
    
    // И наконец проверяем plainText
    if (plainText) {
      if (plainText.includes('3.1') || plainText.includes('3-1') || plainText.includes('etap-3-1') || plainText.includes('etap-31')) {
        return 'etap-3-1';
      }
      if ((plainText.includes('питание') || plainText.includes('увлажнение') || plainText.includes('этап 3') || plainText.includes('etap-3')) && 
          !plainText.includes('3.1') && !plainText.includes('3-1')) {
        return 'etap-3';
      }
      if (plainText.includes('очищение') || plainText.includes('этап 1') || plainText.includes('etap-1')) {
        return 'etap-1';
      }
      if (plainText.includes('тонизация') || plainText.includes('этап 2') || plainText.includes('etap-2')) {
        return 'etap-2';
      }
    }
    
    return null;
  };

  // Список всех этапов
  const allEtaps: BestSellerEtap[] = [
    { id: 1, title: 'Этап 1', name: 'Очищение', slug: 'etap-1' },
    { id: 2, title: 'Этап 2', name: 'Тонизация', slug: 'etap-2' },
    { id: 3, title: 'Этап 3.0', name: 'SOS - уход', slug: 'etap-3' },
    { id: 4, title: 'Этап 3.1', name: 'Питание и увлажнение', slug: 'etap-3-1' }
  ];

  // Следующий этап после этапа товара (для открытия по умолчанию: Этап товара + 1)
  const getNextEtap = (current: string | null): string => {
    if (!current) return 'etap-2';
    if (current === 'etap-1') return 'etap-2';
    if (current === 'etap-2') return 'etap-3';
    if (current === 'etap-3') return 'etap-3-1';
    return 'etap-3-1'; // etap-3-1: следующего нет, остаёмся на 3.1
  };

  // Вычисляем этап текущего товара
  const currentProductEtap = React.useMemo(() => {
    return getCurrentProductEtap();
  }, [item?.id, item?.attributes]);

  // Получаем реальные данные из товара
  const getAttributeValue = (slug: string): string | null => {
    if (!item?.attributes) return null;
    const attr = item.attributes.find((a: any) => a.attribute?.slug === slug);
    if (!attr?.values || attr.values.length === 0) return null;
    const value = attr.values[0];
    return value.name || value.plainText || value.slug || null;
  };

  // Получаем этап товара (нормализованный)
  const productEtap = currentProductEtap;
  const etapTitle = productEtap 
    ? allEtaps.find(e => e.slug === productEtap)?.title || 'Этап'
    : null;
  const etapName = productEtap
    ? allEtaps.find(e => e.slug === productEtap)?.name || ''
    : '';

  // Получаем "для чего" (purpose)
  const purposeValue = getAttributeValue('purpose') || getAttributeValue('dlya-chego');
  
  // Получаем тип продукта (product_type)
  const productTypeValue = getAttributeValue('product_type') || getAttributeValue('tip-produkta');

  const etapsData: Etap[] = [
    ...(productEtap ? [{ id: 1, title: etapTitle || 'Этап', name: etapName, icon: check }] : []),
    ...(purposeValue ? [{ id: 2, title: 'Подходит для', name: purposeValue, icon: check }] : []),
    ...(productTypeValue ? [{ id: 3, title: 'Тип продукта', name: productTypeValue, icon: check }] : [])
  ];

  // По умолчанию открываем следующий этап (Этап товара + 1)
  const [activeEtap, setActiveEtap] = React.useState<string | null>(() => {
    const curr = getCurrentProductEtap();
    const next = getNextEtap(curr);
    if (process.env.NODE_ENV === 'development') {
      console.log('[LazyComponent] Инициализация activeEtap (след. после этапа товара):', curr, '->', next);
    }
    return next;
  });

  // Обновляем activeEtap при загрузке/изменении товара: всегда следующий (Этап товара + 1)
  useEffect(() => {
    if (item && item.id) {
      const next = getNextEtap(currentProductEtap || null);
      if (process.env.NODE_ENV === 'development') {
        console.log('[LazyComponent] activeEtap (след. после этапа товара):', currentProductEtap, '->', next);
      }
      setActiveEtap(next);
    }
  }, [item?.id, currentProductEtap]);

  // Показываем все этапы - исключаем только сам товар из списка товаров, а не этап
  const availableEtaps = allEtaps;


  const isMobile = useScreenMatch(756);

  const handleSizeChange = (option: any) => {
    setActiveSize(option);
  };

  // Используем импортированную функцию editorJsToHtml из utils, которая правильно обрабатывает все блоки

  if (loading || !item) {
    return (
      <div className={styles.productLoader}>
        <SpinnerLoader />
      </div>
    );
  }

  if (item) {
    const activeVariant = (item.variants || []).find((i: any) => i.node.id === activeVariantId);
    const currentPrice = activeVariant?.node.pricing.price.gross.amount || 0;
    const undiscountedPrice = activeVariant?.node.pricing.priceUndiscounted ? (activeVariant.node.pricing.priceUndiscounted as any)?.gross?.amount : null;
    const oldPrice = undiscountedPrice && undiscountedPrice > currentPrice ? undiscountedPrice : null;
    const discount = oldPrice && currentPrice > 0 ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : null;

    // Сортируем медиа по sortOrder (как в дашборде), затем маппим в { url, alt, id }
    const sortMediaByOrder = (media: Array<{ url: string; alt?: string; id?: string; sortOrder?: number | null }>) =>
      [...media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const getSliderMedia = () => {
      // Проверяем, есть ли у активного варианта изображения
      if (activeVariant?.node?.media && Array.isArray(activeVariant.node.media) && activeVariant.node.media.length > 0) {
        const sorted = sortMediaByOrder(activeVariant.node.media as any);
        return sorted.map((img: any) => ({
          url: img.url,
          alt: img.alt || item.name,
          id: img.id || ''
        }));
      }

      // Если у варианта нет изображений, используем изображения товара
      if (Array.isArray(item.media) && item.media.length > 0) {
        const sorted = sortMediaByOrder(item.media as any);
        return sorted.map((img: any) => ({
          url: img.url,
          alt: img.alt || item.name,
          id: (img as any).id || ''
        }));
      }

      // Fallback
      return [{
        url: slide3,
        alt: item.name || 'Fallback'
      }];
    };

    return (
      <>
        <section className={styles.bestSellerInfo}>
          {/* Заголовок для мобилки - виден только на мобилке */}
          <p className={styles.titleMobile}>{item.name}</p>
          
          <article className={styles.imagePart}>
            <div className={styles.imageWrapper}>
              {discount && discount > 0 && (
                <span className={styles.discount}>-{discount}%</span>
              )}
              <HeroSlider
                key={activeVariantId || 'default'} // Key для пересоздания компонента при смене варианта
                media={getSliderMedia()}
              />
            </div>
          </article>

          <article className={styles.infoPart}>
            <div className={styles.infoWrapper}>
              {/* Заголовок для десктопа - скрыт на мобилке */}
              <p className={styles.title}>{item.name}</p>
              {(() => {
                const getAttributeBySlug = (attributes: any[], slug: string) =>
                  attributes?.find((attr: any) => attr.attribute?.slug === slug);
                const getValueFromAttr = (attr: any) =>
                  attr?.values?.[0]?.name ?? attr?.values?.[0]?.plainText ?? attr?.values?.[0]?.slug ?? '';
                const nazvanieAttr = getAttributeBySlug(item.attributes || [], 'nazvanie-iz-nacionalnogo-kataloga');
                const nazvanieValue = nazvanieAttr ? getValueFromAttr(nazvanieAttr) : '';
                const getGtinFromVariant = (variant: any): string => {
                  if (!variant?.node?.attributes || !Array.isArray(variant.node.attributes)) return '';
                  const gtinAttr = variant.node.attributes.find((a: any) => (a.attribute?.slug || '').toLowerCase() === 'gtin');
                  return gtinAttr ? getValueFromAttr(gtinAttr) : '';
                };
                const gtinValue = activeVariant ? getGtinFromVariant(activeVariant) : '';
                if (!gtinValue && !nazvanieValue) return null;
                return (
                  <div className={styles.productMetaBlock}>
                    {gtinValue ? <p className={styles.productMetaLine}>GTIN: {gtinValue}</p> : null}
                    {nazvanieValue ? <p className={styles.productMetaLine}>{nazvanieValue}</p> : null}
                  </div>
                );
              })()}
              <Link
                to={`/reviews?product=${encodeURIComponent(item.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.reviewsLink}
              >
                <StarRating
                  rating={(() => {
                    const reviews = (item.reviews || []) as Array<{ rating?: number }>;
                    if (reviews.length === 0) return 0;
                    const sum = reviews.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0);
                    const avg = sum / reviews.length;
                    return Math.min(5, Math.max(0, Math.round(avg * 10) / 10));
                  })()}
                  text={`Отзывы (${(item.reviews || []).length})`}
                />
              </Link>
              {(() => {
                const getAttributeBySlug = (attributes: any[], slug: string) => {
                  return attributes?.find((attr: any) => attr.attribute?.slug === slug);
                };
                
                // Используем "Короткое описание на странице товара" из атрибутов
                const shortDescAttr = getAttributeBySlug(item.attributes || [], 'korotkoe-opisanie-na-stranice-tovara') ||
                                     getAttributeBySlug(item.attributes || [], 'korotkoe-opisanie-tovara') ||
                                     getAttributeBySlug(item.attributes || [], 'short_description');
                
                // Логируем для отладки
                if (process.env.NODE_ENV === 'development') {
                  console.log('Short desc attr:', shortDescAttr);
                  console.log('Item description:', item.description);
                  console.log('Item description type:', typeof item.description);
                  if (item.description && typeof item.description === 'string') {
                    console.log('Item description length:', item.description.length);
                    console.log('Item description preview:', item.description.substring(0, 200));
                  }
                }
                
                let shortDescription = '';
                if (shortDescAttr?.values && Array.isArray(shortDescAttr.values) && shortDescAttr.values.length > 0) {
                  // Приоритет: richText (полный текст) > plainText (может быть обрезан) > name
                  shortDescription = shortDescAttr.values[0]?.richText || 
                                   shortDescAttr.values[0]?.plainText || 
                                   shortDescAttr.values[0]?.name || '';
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Short description found:', shortDescription);
                    console.log('Short description length:', shortDescription.length);
                    console.log('Short description ends with ...:', shortDescription.trim().endsWith('...'));
                    console.log('Has richText:', !!shortDescAttr.values[0]?.richText);
                    console.log('Has plainText:', !!shortDescAttr.values[0]?.plainText);
                  }
                }
                
                // Проверяем, не обрезано ли короткое описание
                // Если оно заканчивается на "..." или слишком короткое, используем полное описание
                const isTruncated = shortDescription && (
                  shortDescription.trim().endsWith('...') || 
                  shortDescription.trim().endsWith('…') ||
                  (shortDescription.length < 150 && item.description) // Если короткое описание меньше 150 символов и есть полное
                );
                
                // Если есть короткое описание и оно не обрезано, используем его
                if (shortDescription && shortDescription.trim() && !isTruncated) {
                  let htmlContent = shortDescription;
                  if (typeof shortDescription === 'string' && shortDescription.trim().startsWith('{')) {
                    try {
                      const parsed = JSON.parse(shortDescription);
                      htmlContent = editorJsToHtml(parsed);
                    } catch (e) {
                      htmlContent = shortDescription.replace(/\n/g, '<br>');
                    }
                  } else {
                    htmlContent = shortDescription.replace(/\n/g, '<br>');
                  }
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Using short description, HTML length:', htmlContent.length);
                  }
                  
                  return (
                    <p
                      className={styles.desc}
                      dangerouslySetInnerHTML={{
                        __html: htmlContent
                      }}
                    />
                  );
                }
                
                // Если короткого описания нет, используем полное описание как fallback
                if (!item.description) {
                  return null;
                }
                
                const fullDescriptionHtml = editorJsToHtml(item.description);
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('Using full description, HTML length:', fullDescriptionHtml.length);
                  console.log('Full description HTML preview:', fullDescriptionHtml.substring(0, 300));
                }
                
                return (
                  <p
                    className={styles.desc}
                    dangerouslySetInnerHTML={{
                      __html: fullDescriptionHtml
                    }}
                  />
                );
              })()}

              {activeVariantId !== 'example' && (
                <SizeTabs options={item.variants || []} activeVariantId={activeVariantId} />
              )}
            </div>
            <div className={styles.bottomWrapper}>
              <Etaps items={etapsData} />
              {(() => {
                if (!activeVariant) return null;
                
                const getVolumeFromVariant = (variant: any): string => {
                  if (!variant?.node?.attributes || !Array.isArray(variant.node.attributes)) {
                    return variant?.node?.name || '';
                  }
                  
                  const volumeAttr = variant.node.attributes.find((attr: any) => {
                    const slug = attr.attribute?.slug?.toLowerCase() || '';
                    const name = attr.attribute?.name?.toLowerCase() || '';
                    return slug === 'obem' || 
                           slug === 'volume' ||
                           name.includes('объем') ||
                           name.includes('volume');
                  });
                  
                  if (volumeAttr) {
                    const value = volumeAttr.values?.[0];
                    if (value?.name) {
                      return value.name;
                    } else if (value?.plainText) {
                      return value.plainText;
                    } else if (value?.slug) {
                      return value.slug;
                    }
                  }
                  
                  return variant?.node?.name || '';
                };
                
                const volume = getVolumeFromVariant(activeVariant);
                
                return (
                  <AddToCartButton
                    activeVariantId={activeVariantId}
                    title={item.name}
                    thumbnail={item.thumbnail}
                    price={currentPrice}
                    oldPrice={oldPrice}
                    discount={discount}
                    size={volume}
                    defaultText={'Добавить в корзину'}
                    activeText={'Добавить в корзину'}
                    hoverText={'Добавить в корзину'}
                    disabled={!activeVariantId}
                    productId={item.id}
                    variant="product"
                  />
                );
              })()}
            </div>
          </article>
        </section>
        <div className={styles.productSections}>
          <BestSellerTabs options={generateBestsellerTabsOptions(item)} />
          <BestSellerEtaps 
            items={availableEtaps} 
            activeEtap={activeEtap}
            onEtapClick={(etapSlug) => setActiveEtap(etapSlug)}
          />
        </div>
        {!loading && item && (
          <Bestsellers 
            key={`bestsellers-${activeEtap || 'all'}-${item.id}`}
            isTitleHidden 
            isProductPage 
            filterByEtap={activeEtap}
            excludeProductId={item.id}
            excludeProductSlug={item.slug}
          />
        )}
        
        {item.id && (
          <ReviewModal
            isOpen={reviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            productId={item.id}
            productName={item.name}
          />
        )}
      </>
    );
  }
};

export default LazyComponent;
