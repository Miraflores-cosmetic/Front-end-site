import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ProductCard } from '@/components/product-card';
import {
  ProductScrollStrip,
  ProductScrollStripItem,
} from '@/components/product-scroll-strip/ProductScrollStrip';
import { getBestSellers } from '@/store/slices/bestsellersSlice';
import { getProductsByCareStageRest } from '@/graphql/queries/products.service';
import { getCollectionById } from '@/graphql/queries/collection.service';
import { mapProductNodeToBestSeller } from '@/utils/mapProductNodeToBestSeller';
import { BESTSELLERS_COLLECTION_SLUG } from '@/api/catalogApi';
import type { AppDispatch, RootState } from '@/store/store';
import type { BestSellersProduct } from '@/types/products';
import MoreLink, { SectionTitleRow } from '@/components/MoreLink/MoreLink';
import { HomeSection } from '@/components/home-section/HomeSection';
import styles from './Bestsellers.module.scss';

export type BestsellersProps = {
  isTitleHidden?: boolean;
  /** @deprecated unused */
  slidesToShow?: number;
  isProductPage?: boolean;
  isCatalogPage?: boolean;
  isProfilePage?: boolean;
  filterByEtap?: string | null;
  excludeProductId?: string;
  excludeProductSlug?: string;
  collectionId?: string;
  collectionTitle?: string;
  /**
   * Desktop bleed past parent right padding (→ ProductScrollStrip).
   * Default: 32 on padded pages (PDP/catalog/profile), 0 on Home.
   */
  bleed?: number;
  /**
   * LTR start inset for title + first card (explicit, not only parent padding).
   * Default 0 when the page container already pads.
   */
  padInlineStart?: number;
  padInlineStartMobile?: number;
};

const SKELETON_COUNT = 3;

const SKELETON_PRODUCT: BestSellersProduct = {
  id: 'skeleton',
  size: '',
  title: '',
  description: '',
  slug: '',
  price: 0,
  images: [],
  thumbnail: '',
  productVariants: [],
  collections: { id: '', name: '', slug: '' },
};

function excludeProduct(
  products: BestSellersProduct[],
  excludeProductId?: string,
  excludeProductSlug?: string
): BestSellersProduct[] {
  return products.filter((product) => {
    if (excludeProductSlug?.trim()) {
      if (product.slug?.toLowerCase().trim() === excludeProductSlug.toLowerCase().trim()) {
        return false;
      }
    }
    if (excludeProductId?.trim()) {
      if (product.productId === excludeProductId || product.id === excludeProductId) {
        return false;
      }
    }
    return true;
  });
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
  bleed,
  padInlineStart = 0,
  padInlineStartMobile = 0,
}: BestsellersProps) {
  const stripBleed =
    bleed ??
    (isProductPage || isCatalogPage || isProfilePage ? 32 : 0);
  const stripSize = isCatalogPage ? 'md' : 'lg';
  const dispatch = useDispatch<AppDispatch>();
  const { bestSellers, loading, hasAttemptedLoad } = useSelector(
    (state: RootState) => state.bestsellerSlice
  );

  const [collectionProducts, setCollectionProducts] = useState<BestSellersProduct[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [etapProducts, setEtapProducts] = useState<BestSellersProduct[]>([]);
  const [loadingEtap, setLoadingEtap] = useState(false);

  useEffect(() => {
    if (!collectionId && !filterByEtap && !hasAttemptedLoad && !loading) {
      dispatch(getBestSellers());
    }
  }, [dispatch, hasAttemptedLoad, loading, filterByEtap, collectionId]);

  useEffect(() => {
    if (!collectionId?.trim()) {
      setCollectionProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingCollection(true);
    void (async () => {
      try {
        const collection = await getCollectionById(collectionId, 20);
        if (cancelled) return;
        const edges = collection?.products?.edges ?? [];
        setCollectionProducts(edges.map((edge: { node: unknown }) => mapProductNodeToBestSeller(edge.node)));
      } catch {
        if (!cancelled) setCollectionProducts([]);
      } finally {
        if (!cancelled) setLoadingCollection(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  useEffect(() => {
    if (!filterByEtap?.trim()) {
      setEtapProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingEtap(true);
    void (async () => {
      try {
        const result = await getProductsByCareStageRest(
          filterByEtap,
          50,
          excludeProductSlug,
          excludeProductId,
        );
        if (cancelled) return;
        const mapped = result.edges.map((edge: { node: unknown }) =>
          mapProductNodeToBestSeller(edge.node)
        );
        setEtapProducts(excludeProduct(mapped, excludeProductId, excludeProductSlug));
      } catch {
        if (!cancelled) setEtapProducts([]);
      } finally {
        if (!cancelled) setLoadingEtap(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterByEtap, excludeProductId, excludeProductSlug]);

  const products = useMemo(() => {
    if (collectionId?.trim()) return collectionProducts;
    if (filterByEtap?.trim()) return etapProducts;
    return excludeProduct(bestSellers, excludeProductId, excludeProductSlug);
  }, [
    collectionId,
    collectionProducts,
    filterByEtap,
    etapProducts,
    bestSellers,
    excludeProductId,
    excludeProductSlug,
  ]);

  const isLoading = loading || loadingCollection || loadingEtap;
  const isInitialLoading = isLoading && products.length === 0;
  const isRefreshing = (loadingCollection || loadingEtap) && products.length > 0;
  const title = collectionTitle ?? 'Бестселлеры';
  const moreHref =
    collectionId && !collectionId.includes('=')
      ? `/catalog?collection=${encodeURIComponent(collectionId)}`
      : `/catalog?collection=${BESTSELLERS_COLLECTION_SLUG}`;

  const isHomeStrip = !isProductPage && !isCatalogPage && !isProfilePage;

  return (
    <HomeSection
      bleed={isHomeStrip}
      flush={!isHomeStrip}
      className={[
        styles.section,
        isProductPage ? styles.productPage : '',
        isCatalogPage ? styles.catalogPage : '',
        isProfilePage ? styles.profilePage : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={isInitialLoading || isRefreshing ? true : undefined}
      style={
        {
          '--bestsellers-pad-start': `${padInlineStart}px`,
          '--bestsellers-pad-start-mobile': `${padInlineStartMobile}px`,
        } as React.CSSProperties
      }
      aria-label={title}
    >
      {!isTitleHidden ? (
        <SectionTitleRow className={styles.titleRow}>
          <h2 className={styles.title}>{title}</h2>
          <MoreLink to={moreHref} />
        </SectionTitleRow>
      ) : null}

      {isInitialLoading ? (
        <ProductScrollStrip
          size={stripSize}
          bleed={stripBleed}
          bleedMobile={16}
          padInlineStart={padInlineStart}
          padInlineStartMobile={padInlineStartMobile}
          aria-label={`${title}: загрузка`}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <ProductScrollStripItem key={`skeleton-${index}`}>
              <ProductCard product={SKELETON_PRODUCT} loading fluid />
            </ProductScrollStripItem>
          ))}
        </ProductScrollStrip>
      ) : null}

      {products.length > 0 ? (
        <ProductScrollStrip
          size={stripSize}
          bleed={stripBleed}
          bleedMobile={16}
          padInlineStart={padInlineStart}
          padInlineStartMobile={padInlineStartMobile}
          className={[
            styles.stripHost,
            isRefreshing ? styles.stripRefreshing : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {products.map((product, index) => (
            <ProductScrollStripItem key={product.id || `product-${index}`}>
              <ProductCard product={product} loading={false} fluid />
            </ProductScrollStripItem>
          ))}
        </ProductScrollStrip>
      ) : null}

      {!isLoading && products.length === 0 ? (
        <p className={styles.status} role="status">
          Товары не найдены
        </p>
      ) : null}
    </HomeSection>
  );
}
