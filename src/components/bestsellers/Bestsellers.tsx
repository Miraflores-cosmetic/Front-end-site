import React, { useEffect, useState, useMemo, useRef } from 'react';
import styles from './Bestsellers.module.scss';
import { BestSellerProductCard } from './bestSellerCard';
import Layout from '@/components/Layout/Layout';
import { getBestSellers } from '@/store/slices/bestsellersSlice';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { getAllProducts } from '@/graphql/queries/products.service';
import { getCollectionById } from '@/graphql/queries/collection.service';
import type { BestSellersProduct } from '@/types/products';

interface BestsellersProps {
  isTitleHidden?: boolean;
  slidesToShow?: number;
  isProductPage?: boolean; // Флаг для страницы товара
  isCatalogPage?: boolean; // Флаг для страницы каталога
  isProfilePage?: boolean; // Флаг для страницы профиля
  filterByEtap?: string | null; // Фильтр по этапу ухода
  excludeProductId?: string; // ID товара для исключения из списка
  excludeProductSlug?: string; // Slug товара для исключения из списка (более надежно чем ID)
  /** ID коллекции (например Наборы): товары этой коллекции показываются в слайдере */
  collectionId?: string;
  /** Заголовок секции при использовании collectionId (например "Наборы") */
  collectionTitle?: string;
  /** Встроенная секция (например на странице Ателье) — убирает верхний отступ */
  isAtelierSection?: boolean;
}

function mapProductNodeToBestSellers(productNode: any): BestSellersProduct {
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
    if (volumeAttr?.values?.[0]?.name) variantName = volumeAttr.values[0].name;
    else if (volumeAttr?.values?.[0]?.plainText) variantName = volumeAttr.values[0].plainText;
  }
  const variantPrice = variant?.pricing?.price?.gross?.amount || 0;
  const variantUndiscountedPrice = variant?.pricing?.priceUndiscounted?.gross?.amount;
  let oldPrice: number | undefined;
  if (variantUndiscountedPrice && variantUndiscountedPrice > variantPrice && variantPrice > 0) {
    oldPrice = variantUndiscountedPrice;
  } else {
    oldPrice = undefined;
  }
  let discountPercent: number | undefined;
  if (oldPrice && oldPrice > 0 && variantPrice > 0) {
    discountPercent = Math.round(((oldPrice - variantPrice) / oldPrice) * 100);
    if (discountPercent <= 0) {
      discountPercent = undefined;
      oldPrice = undefined;
    }
  } else {
    discountPercent = undefined;
  }
  let description = '';
  if (productNode.attributes && Array.isArray(productNode.attributes)) {
    const descAttr = productNode.attributes.find((attr: any) =>
      attr.attribute?.slug === 'opisanie-v-kartochke-tovara' ||
      attr.attribute?.name?.toLowerCase().includes('описание') ||
      attr.attribute?.name?.toLowerCase().includes('description')
    );
    if (descAttr?.values?.[0]?.plainText) description = descAttr.values[0].plainText;
    else if (descAttr?.values?.[0]?.name) description = descAttr.values[0].name;
  }
  if (!description && productNode.description) {
    try {
      const parsed = typeof productNode.description === 'string' ? JSON.parse(productNode.description) : productNode.description;
      description = parsed?.blocks?.[0]?.data?.text || '';
    } catch {
      description = '';
    }
  }
  let productVariants: any[] = [];
  if (Array.isArray(productNode.productVariants)) {
    productVariants = productNode.productVariants;
  } else if (productNode.productVariants?.edges) {
    productVariants = productNode.productVariants.edges;
  }
  const productVariantsFormatted = productVariants.map((v: any) => {
    const variantNode = v.node || v;
    let vName = variantNode?.name || '';
    if (variantNode?.attributes && Array.isArray(variantNode.attributes)) {
      const volumeAttr = variantNode.attributes.find((attr: any) =>
        attr.attribute?.slug === 'obem' || attr.attribute?.slug === 'volume' ||
        attr.attribute?.name?.toLowerCase().includes('объем') || attr.attribute?.name?.toLowerCase().includes('volume')
      );
      if (volumeAttr?.values?.[0]?.name) vName = volumeAttr.values[0].name;
      else if (volumeAttr?.values?.[0]?.plainText) vName = volumeAttr.values[0].plainText;
    }
    return { node: { ...variantNode, name: vName } };
  });
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
    productType: productNode.productType ? { name: productNode.productType.name } : undefined,
    productVariants: productVariantsFormatted,
    collections: productNode.collections || []
  };
}

export default function Bestsellers({
  isTitleHidden,
  isProductPage = false,
  isCatalogPage = false,
  isProfilePage = false,
  filterByEtap = null,
  excludeProductId,
  excludeProductSlug,
  collectionId,
  collectionTitle,
  isAtelierSection = false
}: BestsellersProps) {
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);
  const sliderWrapperRef = useRef<HTMLDivElement>(null);

  const { bestSellers, loading, hasAttemptedLoad } = useSelector((state: RootState) => state.bestsellerSlice);
  const dispatch = useDispatch<AppDispatch>();

  // Состояние для всех товаров, загруженных через GraphQL
  const [allProducts, setAllProducts] = useState<BestSellersProduct[]>([]);
  const [loadingAllProducts, setLoadingAllProducts] = useState(false);

  // Товары коллекции (например Наборы)
  const [collectionProducts, setCollectionProducts] = useState<BestSellersProduct[]>([]);
  const [loadingCollectionProducts, setLoadingCollectionProducts] = useState(false);

  // Загружаем обычные bestSellers, если нет фильтра по этапу и не коллекция
  useEffect(() => {
    if (!collectionId && !filterByEtap && !hasAttemptedLoad && !loading) {
      dispatch(getBestSellers());
    }
  }, [dispatch, hasAttemptedLoad, loading, filterByEtap, collectionId]);

  // Загружаем товары коллекции по collectionId
  useEffect(() => {
    if (collectionId && collectionId.trim() !== '') {
      const loadCollection = async () => {
        setLoadingCollectionProducts(true);
        try {
          const collection = await getCollectionById(collectionId, 20);
          if (collection?.products?.edges?.length) {
            const mapped = collection.products.edges.map((edge: any) => mapProductNodeToBestSellers(edge.node));
            setCollectionProducts(mapped);
          } else {
            setCollectionProducts([]);
          }
        } catch (err) {
          console.error('[Bestsellers] Ошибка загрузки коллекции:', err);
          setCollectionProducts([]);
        } finally {
          setLoadingCollectionProducts(false);
        }
      };
      loadCollection();
    } else {
      setCollectionProducts([]);
    }
  }, [collectionId]);

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

          const formattedProducts: BestSellersProduct[] = result.edges.map((edge: any) => mapProductNodeToBestSellers(edge.node));

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
    if (collectionId && collectionId.trim() !== '') {
      return collectionProducts;
    }
    if (filterByEtap && filterByEtap.trim() !== '') {
      return allProducts;
    }
    return bestSellers;
  }, [collectionId, collectionProducts, filterByEtap, allProducts, bestSellers]);

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

  // Обработка состояний
  const hasProducts = filteredProducts.length > 0;
  const isLoading = loading || loadingAllProducts || (collectionId ? loadingCollectionProducts : false);

  // Intersection Observer для запуска анимации при скролле к секции
  React.useEffect(() => {
    if (!sectionRef.current || isSectionLoaded) return;

    // Проверяем, видна ли секция сразу при загрузке
    const checkVisibility = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        return isVisible;
      }
      return false;
    };

    // Проверяем сразу
    if (checkVisibility()) {
      setIsSectionLoaded(true);
      return;
    }

    // Небольшая задержка для повторной проверки (на случай если DOM еще не готов)
    const timer = setTimeout(() => {
      if (checkVisibility()) {
        setIsSectionLoaded(true);
        return;
      }
    }, 100);

    // Создаем Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Если секция видна в viewport, запускаем анимацию
          if (entry.isIntersecting && !isSectionLoaded) {
            setIsSectionLoaded(true);
          }
        });
      },
      {
        // Запускаем анимацию когда секция видна на 20%
        threshold: 0.2,
        // Небольшой отступ сверху для более раннего запуска
        rootMargin: '0px 0px -100px 0px'
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isSectionLoaded]);

  // Горизонтальный скролл ленты: тачпад (преобладает deltaX), Shift+колесо. Вертикальное колесо — прокрутка страницы.
  useEffect(() => {
    const el = sliderWrapperRef.current;
    if (!el || !hasProducts) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        return;
      }
      if (absX > absY) {
        e.preventDefault();
        el.scrollLeft += e.deltaX + e.deltaY;
        return;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [hasProducts]);

  return (
    <section
      ref={sectionRef}
      className={`${styles.bestsellers} ${isProductPage ? styles.productPage : ''} ${isCatalogPage ? styles.catalogPage : ''} ${isProfilePage ? styles.profilePage : ''} ${isAtelierSection ? styles.atelierSection : ''} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
      aria-label="Секция бестселлеров"
    >
      <Layout>
        {!isTitleHidden && (
          <h2 className={styles.title}>
            {collectionTitle ?? 'Бестселлеры'}
          </h2>
        )}

        {isLoading && !hasProducts && (
          <div role="status" aria-live="polite">
            <h4>Загрузка</h4>
          </div>
        )}

        {hasProducts && (
          <div
            ref={sliderWrapperRef}
            className={styles.sliderWrapper}
            aria-label="Список товаров"
          >
            <div className={styles.scrollTrack}>
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id || `product-${index}`}
                  role="group"
                  aria-label={`Товар ${index + 1} из ${filteredProducts.length}`}
                  className={styles.scrollItem}
                >
                  <BestSellerProductCard
                    product={product}
                    loading={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !hasProducts && sourceProducts.length > 0 && (
          <div role="status" aria-live="polite">
            <p>Товары не найдены для выбранного этапа</p>
          </div>
        )}

        {!isLoading && sourceProducts.length === 0 && (
          <div role="status" aria-live="polite">
            <p>Товары не найдены</p>
          </div>
        )}
      </Layout>
    </section>
  );
}
