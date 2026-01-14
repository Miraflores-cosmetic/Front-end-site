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
import { useNavigate, useParams } from 'react-router-dom';

import { Product } from '@/types/types';
import { getSingleProduct } from '@/graphql/queries/products.service';
import { generateBestsellerTabsOptions } from '@/utils/tabsGenerator';

import { getProductBySlug } from '@/store/slices/productSlice';

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

  const etapsData: Etap[] = [
    { id: 1, title: 'Этап 1', name: 'Очищение', icon: check },
    { id: 2, title: 'Подходит для', name: 'Всех типов кожи', icon: check },
    { id: 3, title: 'Подходит для', name: 'Всех типов кожи', icon: check }
  ];

  const getCurrentProductEtap = (): string | null => {
    if (!item?.attributes) return null;
    const careStageAttr = item.attributes.find((attr: any) => attr.attribute?.slug === 'care_stage');
    if (!careStageAttr?.values || careStageAttr.values.length === 0) return null;
    
    const value = careStageAttr.values[0];
    
    if (value.slug) {
      return value.slug;
    }
    
    if (value.name) {
      const name = value.name.toLowerCase();
      if (name.includes('очищение') || name.includes('etap-1') || name.includes('этап 1')) {
        return 'etap-1';
      }
      if (name.includes('тонизация') || name.includes('etap-2') || name.includes('этап 2')) {
        return 'etap-2';
      }
      if (name.includes('3.1') || name.includes('3-1')) {
        return 'etap-3-1';
      }
      if (name.includes('питание') || name.includes('увлажнение') || name.includes('etap-3') || name.includes('этап 3')) {
        return 'etap-3';
      }
    }
    
    if (value.plainText) {
      const text = value.plainText.toLowerCase();
      if (text.includes('очищение') || text.includes('etap-1') || text.includes('этап 1')) {
        return 'etap-1';
      }
      if (text.includes('тонизация') || text.includes('etap-2') || text.includes('этап 2')) {
        return 'etap-2';
      }
      if (text.includes('3.1') || text.includes('3-1')) {
        return 'etap-3-1';
      }
      if (text.includes('питание') || text.includes('увлажнение') || text.includes('etap-3') || text.includes('этап 3')) {
        return 'etap-3';
      }
    }
    
    return null;
  };

  const currentProductEtap = getCurrentProductEtap();
  const [activeEtap, setActiveEtap] = React.useState<string | null>(null);

  const allEtaps: BestSellerEtap[] = [
    { id: 1, title: 'Этап 1', name: 'Очищение', slug: 'etap-1' },
    { id: 2, title: 'Этап 2', name: 'Тонизация', slug: 'etap-2' },
    { id: 3, title: 'Этап 3', name: 'Питание и увлажнение', slug: 'etap-3' },
    { id: 4, title: 'Этап 3.1', name: 'Питание и увлажнение', slug: 'etap-3-1' }
  ];

  const availableEtaps = allEtaps.filter(etap => {
    if (!currentProductEtap) return true;
    const etapSlug = etap.slug?.toLowerCase();
    const currentSlug = currentProductEtap.toLowerCase();
    return etapSlug !== currentSlug;
  });


  const isMobile = useScreenMatch(756);

  const handleSizeChange = (option: any) => {
    setActiveSize(option);
  };

  function editorJsToHtml(data: any): string {
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse JSON string:', e);
        return '';
      }
    }

    if (!data || !data.blocks || !Array.isArray(data.blocks)) {
      return '';
    }

    const result = data.blocks
      .map((block: any) => {
        if (block.type === 'paragraph') {
          const text = block.data?.text || '';

          const temp = document.createElement('div');
          temp.innerHTML = text;
          const plainText = temp.textContent || temp.innerText || '';

          return `<p>${plainText}</p>`;
        }
        return '';
      })
      .filter(Boolean)
      .join('');

    return result;
  }

  if (loading) {
    return null;
  }

  if (!loading) {
    const activeVariant = item.variants.find(i => i.node.id === activeVariantId);
    const currentPrice = activeVariant?.node.pricing.price.gross.amount || 0;
    const undiscountedPrice = activeVariant?.node.pricing.priceUndiscounted ? (activeVariant.node.pricing.priceUndiscounted as any)?.gross?.amount : null;
    const oldPrice = undiscountedPrice && undiscountedPrice > currentPrice ? undiscountedPrice : null;
    const discount = oldPrice && currentPrice > 0 ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : null;

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
                media={
                  Array.isArray(item.media)
                    ? item.media
                    : [
                        item.media || {
                          url: slide3,
                          alt: 'Fallback'
                        }
                      ]
                }
              />
            </div>
          </article>

          <article className={styles.infoPart}>
            <div className={styles.infoWrapper}>
              {/* Заголовок для десктопа - скрыт на мобилке */}
              <p className={styles.title}>{item.name}</p>
              <StarRating rating={item.rating ?? 5} text={`${item.reviews.length} отзывов`} />
              {(() => {
                const getAttributeBySlug = (attributes: any[], slug: string) => {
                  return attributes?.find((attr: any) => attr.attribute?.slug === slug);
                };
                
                const shortDescAttr = getAttributeBySlug(item.attributes || [], 'korotkoe-opisanie-na-stranice-tovara') ||
                                     getAttributeBySlug(item.attributes || [], 'korotkoe-opisanie-tovara') ||
                                     getAttributeBySlug(item.attributes || [], 'short_description');
                
                let shortDescription = '';
                if (shortDescAttr?.values && Array.isArray(shortDescAttr.values) && shortDescAttr.values.length > 0) {
                  shortDescription = shortDescAttr.values[0]?.plainText || 
                                   shortDescAttr.values[0]?.name || 
                                   shortDescAttr.values[0]?.richText || '';
                }
                
                if (shortDescription && shortDescription.trim()) {
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
                  
                  return (
                    <p
                      className={styles.desc}
                      dangerouslySetInnerHTML={{
                        __html: htmlContent
                      }}
                    />
                  );
                }
                
                return (
                  <p
                    className={styles.desc}
                    dangerouslySetInnerHTML={{
                      __html: editorJsToHtml(item.description)
                    }}
                  />
                );
              })()}

              {activeVariantId !== 'example' && (
                <SizeTabs options={item.variants} activeVariantId={activeVariantId} />
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
        <Bestsellers 
          isTitleHidden 
          isProductPage 
          filterByEtap={activeEtap}
          excludeProductId={item.id}
          excludeProductSlug={item.slug}
        />
        
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
