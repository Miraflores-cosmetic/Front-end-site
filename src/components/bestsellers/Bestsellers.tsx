import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import styles from './Bestsellers.module.scss';
import { BestSellerProductCard } from './bestSellerCard';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useWindowWidth } from '@/hooks/useWindowWidth';
import Layout from '@/components/Layout/Layout';
import { getBestSellers } from '@/store/slices/bestsellersSlice';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { getAllProducts } from '@/graphql/queries/products.service';
import type { BestSellersProduct } from '@/types/products';

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
  
  // Состояние для всех товаров, загруженных через GraphQL
  const [allProducts, setAllProducts] = useState<BestSellersProduct[]>([]);
  const [loadingAllProducts, setLoadingAllProducts] = useState(false);

  // Загружаем обычные bestSellers, если нет фильтра по этапу
  useEffect(() => {
    if (!filterByEtap && !hasAttemptedLoad && !loading) {
      dispatch(getBestSellers());
    }
  }, [dispatch, hasAttemptedLoad, loading, filterByEtap]);

  // Загружаем все товары через GraphQL, если указан фильтр по этапу
  useEffect(() => {
    if (filterByEtap && filterByEtap.trim() !== '') {
      const loadAllProducts = async () => {
        setLoadingAllProducts(true);
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Bestsellers] Загружаем все товары для фильтрации по этапу:', filterByEtap);
          }
          
          const result = await getAllProducts(100);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[Bestsellers] Получено товаров:', result.edges.length);
          }
          
          // Преобразуем данные из GraphQL формата в формат BestSellersProduct
          const formattedProducts: BestSellersProduct[] = result.edges.map((edge: any) => {
            const productNode = edge.node;
            // productVariants может быть массивом ProductVariant или объектом с edges
            let variant = productNode.defaultVariant;
            if (!variant && productNode.productVariants) {
              if (Array.isArray(productNode.productVariants)) {
                variant = productNode.productVariants[0]?.node || productNode.productVariants[0];
              } else if (productNode.productVariants.edges) {
                variant = productNode.productVariants.edges[0]?.node;
              }
            }
            
            const variantId = variant?.id || productNode.id;
            
            let variantName = variant?.name || '';
            if (variant?.attributes && Array.isArray(variant.attributes)) {
              const volumeAttr = variant.attributes.find((attr: any) => 
                attr.attribute?.slug === 'obem' || 
                attr.attribute?.slug === 'volume' ||
                attr.attribute?.name?.toLowerCase().includes('объем') ||
                attr.attribute?.name?.toLowerCase().includes('volume')
              );
              if (volumeAttr?.values?.[0]?.name) {
                variantName = volumeAttr.values[0].name;
              } else if (volumeAttr?.values?.[0]?.plainText) {
                variantName = volumeAttr.values[0].plainText;
              }
            }
            
            const variantPrice = variant?.pricing?.price?.gross?.amount || 0;
            const variantUndiscountedPrice = variant?.pricing?.priceUndiscounted?.gross?.amount;
            
            let oldPrice: number | undefined = undefined;
            if (variantUndiscountedPrice && variantUndiscountedPrice > variantPrice && variantPrice > 0) {
              oldPrice = variantUndiscountedPrice;
            }
            
            let discountPercent: number | undefined = undefined;
            if (oldPrice && oldPrice > 0 && variantPrice > 0) {
              discountPercent = Math.round(((oldPrice - variantPrice) / oldPrice) * 100);
              if (discountPercent <= 0) {
                discountPercent = undefined;
                oldPrice = undefined;
              }
            }
            
            let description = '';
            if (productNode.attributes && Array.isArray(productNode.attributes)) {
              const descAttr = productNode.attributes.find((attr: any) => 
                attr.attribute?.slug === 'opisanie-v-kartochke-tovara' || 
                attr.attribute?.name?.toLowerCase().includes('описание') ||
                attr.attribute?.name?.toLowerCase().includes('description')
              );
              if (descAttr?.values?.[0]?.plainText) {
                description = descAttr.values[0].plainText;
              } else if (descAttr?.values?.[0]?.name) {
                description = descAttr.values[0].name;
              }
            }
            
            if (!description && productNode.description) {
              try {
                const parsed = typeof productNode.description === 'string' 
                  ? JSON.parse(productNode.description) 
                  : productNode.description;
                description = parsed?.blocks?.[0]?.data?.text || '';
              } catch (e) {
                description = '';
              }
            }
            
            return {
              id: variantId,
              productId: productNode.id,
              size: variantName,
              title: productNode.name || '',
              description,
              price: variantPrice,
              oldPrice: oldPrice,
              discount: discountPercent,
              images: productNode.media?.map((item: any) => item.url) || [],
              thumbnail: productNode.thumbnail?.url || '',
              slug: productNode.slug || '',
              attributes: productNode.attributes || [],
              productVariants: (() => {
                let variants = [];
                if (Array.isArray(productNode.productVariants)) {
                  variants = productNode.productVariants;
                } else if (productNode.productVariants?.edges) {
                  variants = productNode.productVariants.edges;
                }
                
                return variants.map((v: any) => {
                  const variantNode = v.node || v;
                  let variantName = variantNode?.name || '';
                  
                  if (variantNode?.attributes && Array.isArray(variantNode.attributes)) {
                    const volumeAttr = variantNode.attributes.find((attr: any) => 
                      attr.attribute?.slug === 'obem' || 
                      attr.attribute?.slug === 'volume' ||
                      attr.attribute?.name?.toLowerCase().includes('объем') ||
                      attr.attribute?.name?.toLowerCase().includes('volume')
                    );
                    if (volumeAttr?.values?.[0]?.name) {
                      variantName = volumeAttr.values[0].name;
                    } else if (volumeAttr?.values?.[0]?.plainText) {
                      variantName = volumeAttr.values[0].plainText;
                    }
                  }
                  
                  return {
                    node: {
                      ...variantNode,
                      name: variantName
                    }
                  };
                });
              })(),
              collections: productNode.collections || []
            };
          });
          
          // Фильтруем товары по этапу на клиенте
          const filteredByEtap = formattedProducts.filter(product => {
            // Находим этап товара из атрибутов
            // Нужно найти этап из структуры атрибутов товара
            const productEtap = (() => {
              const attrs = product.attributes || [];
              for (const attr of attrs) {
                if (attr?.attribute?.slug === 'care_stage') {
                  const values = attr?.values || [];
                  if (values.length > 0) {
                    const value = values[0];
                    const slug = (value.slug || '').toLowerCase();
                    const name = (value.name || '').toLowerCase();
                    const plainText = (value.plainText || '').toLowerCase();
                    
                    if (slug) {
                      if (slug.includes('etap-1') || slug.includes('ochishchenie')) return 'etap-1';
                      if (slug.includes('etap-2') || slug.includes('tonizatsiia')) return 'etap-2';
                      if (slug.includes('etap-31') || slug.includes('etap-3-1') || slug.includes('etap-3.1')) return 'etap-3-1';
                      if (slug.includes('etap-3') || slug.includes('etap-30') || slug.includes('pitanie') || slug.includes('uvlazhnenie')) return 'etap-3';
                    }
                    
                    if (name) {
                      if (name.includes('3.1') || name.includes('3-1') || name.includes('etap-3-1') || name.includes('etap-31')) return 'etap-3-1';
                      if ((name.includes('питание') || name.includes('увлажнение') || name.includes('этап 3') || name.includes('etap-3')) && 
                          !name.includes('3.1') && !name.includes('3-1')) return 'etap-3';
                      if (name.includes('очищение') || name.includes('этап 1') || name.includes('etap-1')) return 'etap-1';
                      if (name.includes('тонизация') || name.includes('этап 2') || name.includes('etap-2')) return 'etap-2';
                    }
                    
                    if (plainText) {
                      if (plainText.includes('3.1') || plainText.includes('3-1') || plainText.includes('etap-3-1') || plainText.includes('etap-31')) return 'etap-3-1';
                      if ((plainText.includes('питание') || plainText.includes('увлажнение') || plainText.includes('этап 3') || plainText.includes('etap-3')) && 
                          !plainText.includes('3.1') && !plainText.includes('3-1')) return 'etap-3';
                      if (plainText.includes('очищение') || plainText.includes('этап 1') || plainText.includes('etap-1')) return 'etap-1';
                      if (plainText.includes('тонизация') || plainText.includes('этап 2') || plainText.includes('etap-2')) return 'etap-2';
                    }
                  }
                }
              }
              return null;
            })();
            return productEtap === filterByEtap;
          });
          
          // Исключаем товар по slug или id
          const finalProducts = filteredByEtap.filter(product => {
            if (excludeProductSlug && product.slug === excludeProductSlug) return false;
            if (excludeProductId && (product.productId === excludeProductId || product.id === excludeProductId)) return false;
            return true;
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[Bestsellers] Отформатировано товаров:', formattedProducts.length);
            console.log('[Bestsellers] Отфильтровано по этапу', filterByEtap, ':', finalProducts.length);
          }
          
          setAllProducts(finalProducts);
        } catch (err) {
          console.error('[Bestsellers] Ошибка загрузки всех товаров через GraphQL:', err);
          setAllProducts([]);
        } finally {
          setLoadingAllProducts(false);
        }
      };
      
      loadAllProducts();
    } else {
      setAllProducts([]);
    }
  }, [filterByEtap, excludeProductSlug, excludeProductId]);

  // Определяем, какие товары использовать
  const sourceProducts = React.useMemo(() => {
    // Если указан фильтр по этапу, используем товары, загруженные через GraphQL и отфильтрованные на клиенте
    if (filterByEtap && filterByEtap.trim() !== '') {
      return allProducts;
    }
    // Иначе используем обычные bestSellers
    return bestSellers;
  }, [filterByEtap, allProducts, bestSellers]);

  const filteredProducts = React.useMemo(() => {
    let filtered = [...sourceProducts];

    if (excludeProductSlug && excludeProductSlug.trim() !== '') {
      const excludeSlugLower = excludeProductSlug.toLowerCase().trim();
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
    }
    else if (excludeProductId && excludeProductId.trim() !== '') {
      filtered = filtered.filter(product => {
        const hasProductId = product.productId && product.productId === excludeProductId;
        const hasVariantId = product.id && product.id === excludeProductId;
        return !hasProductId && !hasVariantId;
      });
    }

    // Если товары загружены через REST API по этапу, они уже отфильтрованы на бэкенде
    // Дополнительная фильтрация не нужна

    return filtered;
  }, [sourceProducts, excludeProductId, excludeProductSlug]);

  return (
    <section className={`${styles.bestsellers} ${isProductPage ? styles.productPage : ''}`} style={isOversize ? undefined : {}}>
      <Layout>
        {!isTitleHidden && <h2 className={styles.title}>Бестселлеры</h2>}
        {(loading || loadingAllProducts) && filteredProducts.length === 0 && <h4>Загрузка</h4>}

        {filteredProducts.length > 0 && (
          <Slider {...settings} className={styles.slider}>
            {filteredProducts.map(product => (
              <BestSellerProductCard key={product.id} product={product} loading={loading || loadingAllProducts} />
            ))}
          </Slider>
        )}
        
        {!(loading || loadingAllProducts) && filteredProducts.length === 0 && sourceProducts.length > 0 && (
          <p>Товары не найдены для выбранного этапа</p>
        )}
        
        {!(loading || loadingAllProducts) && sourceProducts.length === 0 && (
          <p>Товары не найдены</p>
        )}
      </Layout>
    </section>
  );
}
