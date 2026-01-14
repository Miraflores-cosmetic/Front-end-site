import React, { useEffect } from 'react';
import Slider from 'react-slick';
import styles from './Bestsellers.module.scss';
import { BestSellerProductCard } from './bestSellerCard';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useWindowWidth } from '@/hooks/useWindowWidth';
import Layout from '@/components/Layout/Layout';
import { getBestSellers } from '@/store/slices/bestsellersSlice';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';

interface BestsellersProps {
  isTitleHidden?: boolean;
  slidesToShow?: number;
  isProductPage?: boolean; // Флаг для страницы товара
  filterByEtap?: string | null; // Фильтр по этапу ухода
  excludeProductId?: string; // ID товара для исключения из списка
  excludeProductSlug?: string; // Slug товара для исключения из списка (более надежно чем ID)
}

export default function Bestsellers({
  isTitleHidden,
  slidesToShow = 3.3,
  isProductPage = false,
  filterByEtap = null,
  excludeProductId,
  excludeProductSlug
}: BestsellersProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const settings = {
    dots: true,
    arrows: false,
    infinite: false,
    draggable: true,
    variableWidth: false,
    speed: 500,
    slidesToShow,
    slidesToScroll: 1,

    afterChange: (current: number) => {
      const num = Number.isInteger(current) ? current : Math.ceil(current);
      setActiveIndex(num);
    },
    customPaging: (i: number) => (
      <div className={`${styles.customDot} ${i === activeIndex ? styles.activeDot : ''}`}></div>
    ),

    responsive: [
      {
        breakpoint: 1500,
        settings: {
          slidesToShow: 3.1,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 1000,
        settings: {
          slidesToShow: 3.1,
          slidesToScroll: 1,
          arrows: false,
          centerMode: false
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3.1,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 650,
        settings: {
          slidesToShow: 3.1,
          slidesToScroll: 1,
          arrows: false,
          centerMode: false
        }
      },
      {
        breakpoint: 610,
        settings: {
          slidesToShow: 3.1,

          slidesToScroll: 1,
          dots: false
        }
      },

      {
        breakpoint: 567,
        settings: {
          slidesToShow: 3.1,

          slidesToScroll: 1,
          dots: false
        }
      },
      {
        breakpoint: 500,
        settings: {
          slidesToShow: 3.1,

          slidesToScroll: 1,
          dots: false
        }
      },
      {
        breakpoint: 470,
        settings: {
          slidesToShow: 3.1,
          variableWidth: false,
          slidesToScroll: 1,
          dots: false
        }
      },

      {
        breakpoint: 450,
        settings: {
          slidesToShow: 3.1,
          variableWidth: false,

          slidesToScroll: 1,
          dots: false
        }
      },
      {
        breakpoint: 430,
        settings: {
          slidesToShow: 3.1,
          variableWidth: false,

          slidesToScroll: 1,
          dots: false
        }
      }
    ]
  };
  const width = useWindowWidth();

  const isOversize = useScreenMatch(1536);
  const x = isOversize ? undefined : (width - 1536) / 2 - 16;

  const { bestSellers, loading, error, hasAttemptedLoad } = useSelector((state: RootState) => state.bestsellerSlice);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!hasAttemptedLoad && !loading) {
      dispatch(getBestSellers());
    }
  }, [dispatch, hasAttemptedLoad, loading]);

  const filteredProducts = React.useMemo(() => {
    let filtered = [...bestSellers];

    if (excludeProductSlug && excludeProductSlug.trim() !== '') {
      const excludeSlugLower = excludeProductSlug.toLowerCase().trim();
      const beforeCount = filtered.length;
      filtered = filtered.filter(product => {
        if (!product.slug || product.slug.trim() === '') {
          if (excludeProductId) {
            return product.productId !== excludeProductId && product.id !== excludeProductId;
          }
          return true;
        }
        const productSlugLower = product.slug.toLowerCase().trim();
        return productSlugLower !== excludeSlugLower;
      });
      
      if (process.env.NODE_ENV === 'development') {
        const afterCount = filtered.length;
        if (beforeCount !== afterCount) {
          console.log(`[Bestsellers] Исключено ${beforeCount - afterCount} товар(ов) по slug: ${excludeProductSlug}`);
        }
      }
    }
    else if (excludeProductId && excludeProductId.trim() !== '') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(product => {
        const hasProductId = product.productId && product.productId === excludeProductId;
        const hasVariantId = product.id && product.id === excludeProductId;
        return !hasProductId && !hasVariantId;
      });
      
      if (process.env.NODE_ENV === 'development') {
        const afterCount = filtered.length;
        if (beforeCount !== afterCount) {
          console.log(`[Bestsellers] Исключено ${beforeCount - afterCount} товар(ов) по ID: ${excludeProductId}`);
        }
      }
    }

    if (filterByEtap && filterByEtap !== '') {
      filtered = filtered.filter(product => {
        if (!product.attributes) return false;
        
        const careStageAttr = product.attributes.find((attr: any) => 
          attr.attribute?.slug === 'care_stage'
        );
        
        if (!careStageAttr?.values || careStageAttr.values.length === 0) return false;
        
        const value = careStageAttr.values[0];
        const filterSlug = filterByEtap.toLowerCase();
        
        if (value.slug && value.slug.toLowerCase() === filterSlug) {
          return true;
        }
        
        if (value.name) {
          const name = value.name.toLowerCase();
          if (
            (filterSlug === 'etap-1' && (name.includes('очищение') || name.includes('этап 1'))) ||
            (filterSlug === 'etap-2' && (name.includes('тонизация') || name.includes('этап 2'))) ||
            (filterSlug === 'etap-3-1' && (name.includes('3.1') || name.includes('3-1'))) ||
            (filterSlug === 'etap-3' && (name.includes('питание') || name.includes('увлажнение') || name.includes('этап 3')))
          ) {
            return true;
          }
        }
        
        if (value.plainText) {
          const text = value.plainText.toLowerCase();
          if (
            (filterSlug === 'etap-1' && (text.includes('очищение') || text.includes('этап 1'))) ||
            (filterSlug === 'etap-2' && (text.includes('тонизация') || text.includes('этап 2'))) ||
            (filterSlug === 'etap-3-1' && (text.includes('3.1') || text.includes('3-1'))) ||
            (filterSlug === 'etap-3' && (text.includes('питание') || text.includes('увлажнение') || text.includes('этап 3')))
          ) {
            return true;
          }
        }
        
        return false;
      });
    }

    return filtered;
  }, [bestSellers, filterByEtap, excludeProductId, excludeProductSlug]);

  return (
    <section className={`${styles.bestsellers} ${isProductPage ? styles.productPage : ''}`} style={isOversize ? undefined : {}}>
      <Layout>
        {!isTitleHidden && <h2 className={styles.title}>Бестселлеры</h2>}
        {loading && bestSellers.length === 0 && <h4>Загрузка</h4>}

        {filteredProducts.length > 0 && (
          <Slider {...settings} className={styles.slider}>
            {filteredProducts.map(product => (
              <BestSellerProductCard key={product.id} product={product} loading={loading} />
            ))}
          </Slider>
        )}
        
        {!loading && filteredProducts.length === 0 && bestSellers.length > 0 && (
          <p>Товары не найдены для выбранного этапа</p>
        )}
        
        {!loading && bestSellers.length === 0 && (
          <p>Товары не найдены</p>
        )}
      </Layout>
    </section>
  );
}
