import React, { useEffect, useState } from 'react';
import styles from './Sets.module.scss';
import arrowToRight from '@/assets/icons/ArrowToRight.svg';
import krem from '@/assets/images/krem.webp';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { Link } from 'react-router-dom';
import { getCollectionById, CollectionProduct } from '@/graphql/queries/collection.service';
import { getAllSets, getSetImageFromModel } from '@/graphql/queries/pages.service';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import { BestSellersProduct } from '@/types/products';

interface SetData {
  id: string;
  title: string;
  price: string;
  description: string;
  image: string;
  slug: string;
  setImage?: string;
  product?: BestSellersProduct;
}

const LeftBlock: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <div className={styles.left}>
    <p className={styles.leftTitle}>
    Наши продукты прекрасно
сочетаются между собой,
усиливая действие друг друга.
Чтобы вам было удобно, мы
собрали попные наборы ухода,
учитывающие разные запросы
кожи.
В каждом наборе вы найдёте
полноступенчатый уход от
очищения до финального этапа
защиты и восстановления.
Покупать наборами не только
удобно, но и выгодно: все товары
в данной категории уже идут со
скидкой, так что вы получаете
попноценный ритуал ухода по
более привлекательной цене.
    </p>

    {isMobile && (
      <div className={styles.rightWrapper}>
        <img src={krem} alt='Крем' />
      </div>
    )}

    <div className={styles.moreWrapper}>
      <Link to='/'>
        <p>Больше наборов</p>
        <img src={arrowToRight} alt='Показать больше наборов' />
      </Link>
    </div>
  </div>
);

const CenterBlock: React.FC<{ product: BestSellersProduct | null; isMobile: boolean }> = ({ product, isMobile }) => {
  if (isMobile || !product) return null;

  return (
    <div className={styles.center}>
      <BestSellerProductCard product={product} loading={false} />
    </div>
  );
};

const RightBlock: React.FC<{ setImage?: string; isMobile: boolean }> = ({ setImage, isMobile }) =>
  isMobile ? null : (
    <div className={styles.right}>
      <div className={styles.rightWrapper}>
        {setImage ? (
          <ImageWithFallback
            src={setImage}
            alt='Набор'
            className={styles.setImage}
          />
        ) : (
          <img src={krem} alt='Крем' />
        )}
      </div>
    </div>
  );

export const Sets: React.FC = () => {
  const isMobile = useScreenMatch(680);
  const [sets, setSets] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [setImagesMap, setSetImagesMap] = useState<{ bySlug: Map<string, string>; byName: Map<string, string> }>({ bySlug: new Map(), byName: new Map() });
  const [defaultSetImage, setDefaultSetImage] = useState<string | null>(null);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchSets = async () => {
      try {
        setLoading(true);
        
        // Получаем коллекцию "Наборы" по ID (Q29sbGVjdGlvbjoxMQ==)
        const collection = await getCollectionById('Q29sbGVjdGlvbjoxMQ==', 10);
        
        // Получаем картинку набора из конкретной модели (UGFnZToxNQ==)
        const setImageFromModel = await getSetImageFromModel('UGFnZToxNQ==');
        if (setImageFromModel) {
          setDefaultSetImage(setImageFromModel);
          console.log('[Sets] ✅ Got set image from model:', setImageFromModel);
        } else {
          console.warn('[Sets] ⚠️ No set image found in model UGFnZToxNQ==');
        }
        
        // Получаем картинки наборов из модели (для сопоставления с товарами)
        const setsImages = await getAllSets();
        setSetImagesMap(setsImages);

        if (collection && collection.products.edges.length > 0) {
          const setsData: SetData[] = collection.products.edges.map((edge) => {
            const product = edge.node;
            const variant = product.defaultVariant || product.productVariants?.edges?.[0]?.node;
            const variantId = variant?.id || product.id;
            const variantName = variant?.name || '';
            const variantPrice = variant?.pricing?.price?.gross?.amount || 0;
            const variantUndiscountedPrice = variant?.pricing?.priceUndiscounted?.gross?.amount;
            
            // Вычисляем старую цену и процент скидки
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
            
            // Извлекаем описание
            let description = '';
            if (product.description) {
              try {
                const parsed = typeof product.description === 'string' 
                  ? JSON.parse(product.description) 
                  : product.description;
                if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
                  const firstParagraph = parsed.blocks.find((block: any) => block.type === 'paragraph');
                  if (firstParagraph?.data?.text) {
                    const temp = document.createElement('div');
                    temp.innerHTML = firstParagraph.data.text;
                    const text = temp.textContent || temp.innerText || '';
                    description = text.length > 100 ? text.substring(0, 100) + '...' : text;
                  }
                }
              } catch (e) {
                description = '';
              }
            }
            
            const productImage = product.thumbnail?.url || product.media?.[0]?.url || '';
            const images = product.media?.map((item: any) => item.url) || [];
            
            // Ищем картинку набора по slug или по названию товара
            let setImage = setsImages.bySlug.get(product.slug);
            if (!setImage) {
              setImage = setsImages.byName.get(product.name.toLowerCase().trim());
            }
            if (!setImage) {
              setImage = defaultSetImage || undefined;
            }

            // Преобразуем варианты в нужный формат
            const productVariants = (product.productVariants?.edges || []).map((v: any) => {
              // Извлекаем название варианта (может быть в name или в атрибутах)
              let variantName = v.node?.name || '';
              
              // Если в name есть информация об объеме, используем её
              // Иначе ищем в атрибутах
              if (v.node?.attributes && Array.isArray(v.node.attributes)) {
                const volumeAttr = v.node.attributes.find((attr: any) => 
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
                  id: v.node.id,
                  name: variantName || v.node.name || '',
                  sku: v.node.sku || '',
                  attributes: (v.node.attributes || []).map((attr: any) => ({
                    attribute: {
                      id: attr.attribute?.id || '',
                      name: attr.attribute?.name || '',
                      slug: attr.attribute?.slug || ''
                    },
                    values: (attr.values || []).map((val: any) => ({
                      name: val.name,
                      slug: val.slug,
                      plainText: val.plainText ?? undefined
                    }))
                  })),
                  pricing: {
                    discount: {
                      net: {
                        amount: v.node.pricing?.discount?.net?.amount || 
                               v.node.pricing?.discount?.gross?.amount || 0,
                        currency: v.node.pricing?.discount?.net?.currency || 
                                 v.node.pricing?.discount?.gross?.currency || 'RUB'
                      }
                    },
                    price: {
                      gross: {
                        amount: v.node.pricing?.price?.gross?.amount || 0,
                        currency: 'RUB'
                      }
                    },
                    priceUndiscounted: v.node.pricing?.priceUndiscounted ? {
                      gross: {
                        amount: v.node.pricing.priceUndiscounted.gross.amount,
                        currency: 'RUB'
                      }
                    } : undefined
                  }
                }
              };
            });

            const firstCollection = product.collections && Array.isArray(product.collections) && product.collections.length > 0
              ? product.collections[0]
              : { id: '', name: '', slug: '' };

            const bestSellerProduct: BestSellersProduct = {
              id: variantId,
              size: variantName,
              title: product.name || '',
              description: description,
              price: variantPrice,
              oldPrice: oldPrice,
              discount: discountPercent,
              images: images.length > 0 ? images : [productImage],
              thumbnail: productImage,
              slug: product.slug || '',
              productVariants: productVariants,
              collections: firstCollection
            };

            return {
              id: product.id,
              title: product.name,
              price: Math.round(variantPrice).toLocaleString('ru-RU') + '₽',
              description: description,
              image: productImage,
              slug: product.slug,
              setImage: setImage,
              product: bestSellerProduct
            };
          });

          setSets(setsData);
        }
      } catch (error) {
        console.error('Error fetching sets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSets();
  }, []);

  // Intersection Observer для запуска анимации при скролле к секции
  useEffect(() => {
    if (loading || !sectionRef.current || isSectionLoaded) return;

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
  }, [isSectionLoaded, loading]);

  if (loading) {
    return <SpinnerLoader />;
  }

  if (sets.length === 0) {
    return null;
  }

  // Берем первый набор для отображения
  const firstSet = sets[0];
  
  // Используем картинку из модели, если есть
  const displaySetImage = firstSet?.setImage || defaultSetImage;

  return (
    <section 
      ref={sectionRef}
      className={`${styles.setsContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
    >
      <h2 className={styles.title}>Наборы</h2>
      <div className={styles.setsWrapper}>
        <LeftBlock isMobile={isMobile} />
        <CenterBlock product={firstSet?.product || null} isMobile={isMobile} />
        <RightBlock setImage={displaySetImage || undefined} isMobile={isMobile} />
      </div>
    </section>
  );
};
