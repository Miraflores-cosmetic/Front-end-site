import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import check from '@/assets/icons/tick-circle.svg';
import slide3 from '@/assets/images/item-photo.jpg';
import type { Etap } from '@/components/etpas/Etaps';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { generateBestsellerTabsOptions } from '@/utils/tabsGenerator';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { isVariantOutOfStock } from '@/utils/stock';
import { getProductBySlug } from '@/store/slices/productSlice';
import type { AppDispatch, RootState } from '@/store/store';
import { CARE_STAGE_SLUGS, useCareStageTabs } from './hooks/useCareStageTabs';
import { useProductReviews } from './hooks/useProductReviews';
import { useProductSeo } from './hooks/useProductSeo';
import { sortMediaByOrder } from './productDetailUtils';
import { ProductGallery } from './sections/ProductGallery';
import { ProductBuyBox } from './sections/ProductBuyBox';
import { ProductStickyBar } from './sections/ProductStickyBar';
import { ProductCareSection } from './sections/ProductCareSection';
import { ProductBreadcrumbs } from './sections/ProductBreadcrumbs';
import { ProductDetailSkeleton } from './sections/ProductDetailSkeleton';
import { ProductNotFound } from './sections/ProductNotFound';
import styles from './ProductDetail.module.scss';

export default function ProductDetailView() {
  const { item, activeVariantId, loading, notFound } = useSelector(
    (state: RootState) => state.product,
  );
  const { slug } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const isMobile = useScreenMatch();

  useEffect(() => {
    dispatch(getProductBySlug({ slug: slug ?? '' }));
  }, [slug, dispatch]);

  const { ratingAvg, ratingCount } = useProductReviews(item?.slug || slug);

  useProductSeo({
    title: item?.metaTitle?.trim() || item?.name || '',
    titleAsIs: Boolean(item?.metaTitle?.trim()),
    description:
      item?.metaDescription?.trim() ||
      item?.pageShortDescriptionHtml ||
      item?.description ||
      '',
    imageUrl:
      item?.ogImageUrl ||
      item?.thumbnail ||
      item?.media?.[0]?.url ||
      '',
    canonicalPath:
      item?.canonicalPath ||
      (item?.slug ? `/product/${item.slug}` : undefined),
    noIndex: item?.seoNoIndex,
  });

  const productTagSlugs = useMemo(
    () => (item?.catalogTags ?? []).map((t) => t.slug),
    [item?.catalogTags],
  );

  const { availableEtaps, orderedSlugs, currentProductEtap, currentEtapMeta, nextCareStageSlug } =
    useCareStageTabs(productTagSlugs);

  const [activeEtap, setActiveEtap] = useState<string | null>(CARE_STAGE_SLUGS[1]);

  useEffect(() => {
    if (!item?.id) return;
    setActiveEtap(nextCareStageSlug(currentProductEtap, orderedSlugs));
  }, [item?.id, currentProductEtap, orderedSlugs, nextCareStageSlug]);

  const purposeValue = item?.purpose?.trim() || null;
  const productTypeValue = item?.productTypeName?.trim() || null;

  const etapsData: Etap[] = [
    ...(currentEtapMeta
      ? [{ id: 1, title: currentEtapMeta.title, name: currentEtapMeta.name, icon: check }]
      : []),
    ...(purposeValue ? [{ id: 2, title: 'Подходит для', name: purposeValue, icon: check }] : []),
    ...(productTypeValue
      ? [{ id: 3, title: 'Тип продукта', name: productTypeValue, icon: check }]
      : []),
  ];

  const bestsellerTabOptions = useMemo(() => {
    if (!item) return [];
    return generateBestsellerTabsOptions(item);
  }, [item]);

  const pageShortHtml = useMemo(() => {
    if (!item?.pageShortDescriptionHtml?.trim()) return '';
    return editorJsToHtml(item.pageShortDescriptionHtml);
  }, [item?.pageShortDescriptionHtml]);

  if (loading || (!item && !notFound)) {
    return <ProductDetailSkeleton />;
  }

  if (notFound || !item) {
    return <ProductNotFound />;
  }

  const activeVariant = (item.variants || []).find((i) => i.node.id === activeVariantId);
  const currentPrice = activeVariant?.node?.pricing?.price?.gross?.amount || 0;
  const undiscountedPrice =
    activeVariant?.node?.pricing?.priceUndiscounted?.gross?.amount ?? null;
  const oldPrice =
    undiscountedPrice && undiscountedPrice > currentPrice ? undiscountedPrice : null;
  const discount =
    oldPrice && currentPrice > 0
      ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
      : null;
  const formattedPrice = Math.round(currentPrice).toLocaleString('ru-RU');
  const formattedOldPrice = oldPrice
    ? Math.round(oldPrice).toLocaleString('ru-RU')
    : null;

  const variantOutOfStock = activeVariant
    ? isVariantOutOfStock({
        trackInventory: activeVariant.node.trackInventory,
        quantityAvailable: activeVariant.node.quantityAvailable,
      })
    : false;

  const getSliderMedia = () => {
    const mapItem = (img: {
      url: string;
      alt?: string;
      id?: string;
      mediaType?: string | null;
    }) => ({
      url: img.url,
      alt: img.alt || item.name,
      id: img.id || '',
      mediaType: img.mediaType || 'image',
    });

    if (
      activeVariant?.node?.media &&
      Array.isArray(activeVariant.node.media) &&
      activeVariant.node.media.length > 0
    ) {
      return sortMediaByOrder(activeVariant.node.media).map(mapItem);
    }
    if (Array.isArray(item.media) && item.media.length > 0) {
      return sortMediaByOrder(item.media).map(mapItem);
    }
    return [{ url: slide3, alt: item.name || 'Fallback', mediaType: 'image' as const }];
  };

  return (
    <>
      <ProductBreadcrumbs productName={item.name} category={item.category} />
      <section className={styles.bestSellerInfo}>
        <h1 className={styles.titleMobile} aria-hidden={!isMobile}>
          {item.name}
        </h1>
        <ProductGallery
          media={getSliderMedia()}
          discount={discount}
          outOfStock={variantOutOfStock}
          sliderKey={activeVariantId || 'default'}
        />
        <ProductBuyBox
          item={item}
          activeVariant={activeVariant}
          activeVariantId={activeVariantId}
          pageShortHtml={pageShortHtml}
          etapsData={etapsData}
          ratingAvg={ratingAvg}
          ratingCount={ratingCount}
          currentPrice={currentPrice}
          oldPrice={oldPrice}
          discount={discount}
          outOfStock={variantOutOfStock}
          showDesktopAtc={!isMobile}
          titleAriaHidden={isMobile}
        />
      </section>

      {isMobile && activeVariant ? (
        <ProductStickyBar
          item={item}
          activeVariant={activeVariant}
          activeVariantId={activeVariantId}
          currentPrice={currentPrice}
          oldPrice={oldPrice}
          discount={discount}
          formattedPrice={formattedPrice}
          formattedOldPrice={formattedOldPrice}
          outOfStock={variantOutOfStock}
        />
      ) : null}

      <ProductCareSection
        productId={item.id!}
        productSlug={item.slug}
        tabOptions={bestsellerTabOptions}
        availableEtaps={availableEtaps}
        activeEtap={activeEtap}
        onEtapClick={setActiveEtap}
      />
    </>
  );
}
