import React from 'react';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import BestSellerTabs from '@/components/bestseller-card/bestseller-tabs/BestSellerTabs';
import BestSellerEtaps, {
  type BestSellerEtap,
} from '@/components/bestseller-card/bestseller-etaps/BestsellerEtaps';
import styles from '../ProductDetail.module.scss';

type TabOption = {
  id: string;
  label: string;
  price: number;
  Content: React.FC;
};

type ProductCareSectionProps = {
  productId: string;
  productSlug: string;
  tabOptions: TabOption[];
  availableEtaps: BestSellerEtap[];
  activeEtap: string | null;
  onEtapClick: (slug: string) => void;
};

export function ProductCareSection({
  productId,
  productSlug,
  tabOptions,
  availableEtaps,
  activeEtap,
  onEtapClick,
}: ProductCareSectionProps) {
  const activeMeta = availableEtaps.find((e) => e.slug === activeEtap);
  const relatedTitle = activeMeta
    ? `${activeMeta.title}: ${activeMeta.name}`
    : 'Следующий этап ухода';

  return (
    <>
      <div className={styles.productSections}>
        {tabOptions.length > 0 ? (
          <BestSellerTabs key={`product-tabs-${productId}`} options={tabOptions} />
        ) : null}
        <BestSellerEtaps
          items={availableEtaps}
          activeEtap={activeEtap}
          onEtapClick={onEtapClick}
        />
      </div>
      <Bestsellers
        isProductPage
        isTitleHidden
        collectionTitle={relatedTitle}
        filterByEtap={activeEtap}
        excludeProductId={productId}
        excludeProductSlug={productSlug}
      />
    </>
  );
}
