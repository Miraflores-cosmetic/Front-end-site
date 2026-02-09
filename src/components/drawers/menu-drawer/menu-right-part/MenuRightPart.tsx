import React, { useEffect, useState, useMemo } from 'react';
import styles from './MenuRightPart.module.scss';
import centerImageMenu from '@/assets/images/centerImageMenu.png';
import lineTo from '@/assets/icons/linToMenu.svg';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import { BestSellersProduct, ProductVariant } from '@/types/products';

import { useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { getCollectionById, Collection, CollectionProduct } from '@/graphql/queries/collection.service';

const MENU_COLLECTION_ID = 'Q29sbGVjdGlvbjoxMg==';

function editorJsToText(data: any): string {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return data;
    }
  }

  if (!data || !data.blocks || !Array.isArray(data.blocks)) {
    return '';
  }

  return data.blocks
    .map((block: any) => {
      if (block.type === 'paragraph') {
        const text = block.data?.text || '';
        const temp = document.createElement('div');
        temp.innerHTML = text;
        return temp.textContent || temp.innerText || '';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

const getVolumeFromVariant = (variant: any): string => {
  if (!variant?.attributes || !Array.isArray(variant.attributes)) {
    return variant?.name || '';
  }
  const volumeAttr = variant.attributes.find((attr: any) => {
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
    }
  }
  
  return variant?.name || '';
};

const convertToBestSellersProduct = (product: CollectionProduct): BestSellersProduct | null => {
  if (!product) return null;

  const defaultVariant = product.defaultVariant;
  if (!defaultVariant) return null;

  const variantId = defaultVariant.id;
  const variantPrice = defaultVariant.pricing.price.gross.amount || 0;
  const variantUndiscountedPrice = defaultVariant.pricing.priceUndiscounted?.gross?.amount;
  const variantDiscountAmount = defaultVariant.pricing.discount?.gross?.amount;

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
  if (product.attributes && Array.isArray(product.attributes)) {
    const descAttr = product.attributes.find((attr: any) => 
      attr.attribute?.slug === 'opisanie-v-kartochke-tovara' || 
      attr.attribute?.slug === 'product_card_description' ||
      attr.attribute?.name?.toLowerCase().includes('описание в карточке') ||
      attr.attribute?.name?.toLowerCase().includes('description')
    );
    if (descAttr?.values && Array.isArray(descAttr.values) && descAttr.values.length > 0) {
      description = descAttr.values[0]?.plainText || 
                   descAttr.values[0]?.name || 
                   '';
    }
  }

  const productVariants: ProductVariant[] = (product.productVariants?.edges || []).map((v: any) => {
    let variantName = v.node?.name || '';
    
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
        sku: v.node.sku || '',
        name: variantName,
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
              amount: v.node.pricing?.discount?.net?.amount || v.node.pricing?.discount?.gross?.amount || 0,
              currency: v.node.pricing?.discount?.net?.currency || v.node.pricing?.discount?.gross?.currency || 'RUB'
            }
          },
          price: {
            gross: {
              amount: v.node.pricing?.price?.gross?.amount || 0,
              currency: v.node.pricing?.price?.gross?.currency || 'RUB'
            }
          },
          priceUndiscounted: v.node.pricing?.priceUndiscounted ? {
            gross: {
              amount: v.node.pricing.priceUndiscounted.gross?.amount || 0,
              currency: v.node.pricing.priceUndiscounted.gross?.currency || 'RUB'
            }
          } : undefined
        }
      }
    };
  });

  const images = product.media?.map(item => item.url) || [];
  const thumbnail = product.thumbnail?.url || images[0] || '';

  let defaultVariantSize = defaultVariant.name || '';
  if (productVariants.length > 0) {
    const firstVariant = productVariants[0];
    if (firstVariant?.node?.name) {
      defaultVariantSize = firstVariant.node.name;
    }
  }

  return {
    id: variantId,
    productId: product.id,
    size: defaultVariantSize,
    title: product.name || '',
    description: description,
    slug: product.slug || '',
    price: variantPrice,
    oldPrice: oldPrice,
    discount: discountPercent,
    images: images.length > 0 ? images : thumbnail,
    thumbnail: thumbnail,
    productVariants: productVariants,
    collections: product.collections?.[0] || { id: '', name: '', slug: '' },
    attributes: product.attributes || []
  };
};

const MenuRightPart: React.FC = () => {
  const dispatch = useDispatch();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        setLoading(true);
        const data = await getCollectionById(MENU_COLLECTION_ID, 1);
        setCollection(data);
      } catch (error) {
        console.error('[MenuRightPart] Error fetching collection:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, []);

  const firstProduct = collection?.products?.edges?.[0]?.node;
  const productCard = useMemo(() => {
    if (!firstProduct) return null;
    return convertToBestSellersProduct(firstProduct);
  }, [firstProduct]);

  const collectionDescription = useMemo(() => {
    return collection?.description 
      ? editorJsToText(collection.description) 
      : '';
  }, [collection]);

  return (
    <div className={styles.right}>
      <p className={styles.close} onClick={() => dispatch(closeDrawer())}>
        Закрыть
      </p>
      <div className={styles.rightWraeer}>
        {loading ? (
          <div>Загрузка...</div>
        ) : productCard ? (
          <div className={styles.imgWrapper}>
            <BestSellerProductCard product={productCard} loading={loading} />
            <img src={lineTo} alt='lineTo' className={styles.lineTo} />
            {collectionDescription && (
              <p className={styles.textTo}>{collectionDescription}</p>
            )}
          </div>
        ) : (
          <div>Товар не найден</div>
        )}
      </div>
      <div className={styles.centerImageContainer}>
        <img src={centerImageMenu} alt='centerImageMenu' width={188} height={216} />
        <button 
          onClick={() => {
            window.open('https://t.me/Miraflores_Cosmetics_Bot', '_blank', 'noopener,noreferrer');
            dispatch(closeDrawer());
          }}
        >
          Подобрать уход
        </button>
      </div>
    </div>
  );
};

export default MenuRightPart;
