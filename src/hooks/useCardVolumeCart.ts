import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { VolumePickerOption } from '@miraflores/volume-picker';
import { useToast } from '@/components/toast/toast';
import { addItemToCart } from '@/store/slices/checkoutSlice';
import type { RootState } from '@/store/store';
import type { BestSellersProduct, ProductVariant } from '@/types/products';
import { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';
import { isVariantOutOfStock } from '@/utils/stock';
import {
  cartWouldMixGiftAndPhysical,
  isGiftDenomVariantId,
} from '@/utils/giftDenomCart';
import {
  MetrikaGoal,
  isFavoritesPathStrict,
  markCartFromFavorites,
  reachGoal,
} from '@/lib/metrika';

function variantMinQty(v: ProductVariant): number {
  const raw = v.node?.orderMinQty;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  return 1;
}

function variantUnitPrice(v: ProductVariant): number {
  return v.node?.pricing?.price?.gross?.amount ?? 0;
}

function variantOldPrice(v: ProductVariant): number | null {
  const price = variantUnitPrice(v);
  const undiscounted = v.node?.pricing?.priceUndiscounted?.gross?.amount;
  if (undiscounted != null && undiscounted > price) return undiscounted;
  return null;
}

export type UseCardVolumeCartArgs = {
  product: BestSellersProduct;
  mainImage: string;
  isGiftCertificates: boolean;
  /** Default / card variant for single-volume ATC props. */
  activeVariant: ProductVariant | null;
  outOfStock: boolean;
  quantityLimitForCard: number | null;
  quantityAvailable: number | null;
  trackInventory: boolean | null;
  productIdForFavorite?: string;
};

/**
 * Объёмы + модалка + add-to-cart с productCard (не PDP).
 */
export function useCardVolumeCart({
  product,
  mainImage,
  isGiftCertificates,
  activeVariant,
  outOfStock,
  quantityLimitForCard,
  quantityAvailable,
  trackInventory,
  productIdForFavorite,
}: UseCardVolumeCartArgs) {
  const dispatch = useDispatch();
  const toast = useToast();
  const cartLines = useSelector((state: RootState) => state.checkout.lines);
  const [volumeModalOpen, setVolumeModalOpen] = useState(false);

  const volumeOptions = useMemo((): VolumePickerOption[] => {
    if (isGiftCertificates) return [];
    const variants = product.productVariants ?? [];
    return variants
      .filter((v) => variantUnitPrice(v) > 0)
      .map((v) => ({
        id: v.node.id,
        label: getVolumeFromVariant(v) || v.node.name || 'объём',
        price: variantUnitPrice(v),
        oldPrice: variantOldPrice(v),
        quantityAvailable: v.node.quantityAvailable ?? null,
        trackInventory: v.node.trackInventory ?? true,
        minQty: variantMinQty(v),
        maxQty: v.node.quantityLimitPerCustomer ?? undefined,
      }));
  }, [isGiftCertificates, product.productVariants]);

  const needsVolumePick = volumeOptions.length > 1;

  const openVolumeModal = useCallback(() => {
    setVolumeModalOpen(true);
  }, []);

  const closeVolumeModal = useCallback(() => {
    setVolumeModalOpen(false);
  }, []);

  const addVariantToCart = useCallback(
    (variant: ProductVariant) => {
      const variantId = variant.node.id;
      if (!variantId) return;
      const oos = isVariantOutOfStock({
        trackInventory: variant.node.trackInventory ?? true,
        quantityAvailable: variant.node.quantityAvailable ?? null,
      });
      if (oos) {
        toast.error('Нет в наличии');
        return;
      }
      const giftDenom = isGiftDenomVariantId(variantId);
      if (
        cartWouldMixGiftAndPhysical(cartLines, {
          variantId,
          isGiftDenom: giftDenom,
        })
      ) {
        toast.error(
          'Нельзя смешивать подарочные сертификаты и обычные товары — оформите отдельно',
        );
        return;
      }
      const price = variantUnitPrice(variant);
      const oldPrice = variantOldPrice(variant);
      const discount =
        oldPrice != null && oldPrice > price
          ? Math.round(((oldPrice - price) / oldPrice) * 100)
          : null;
      const minQty = variantMinQty(variant);
      dispatch(
        addItemToCart({
          variantId,
          quantity: minQty,
          title: product.title,
          productType: (product.productType?.name || '').trim() || null,
          thumbnail: mainImage || '',
          price,
          oldPrice,
          discount,
          size: getVolumeFromVariant(variant) || product.size || '',
          slug: product.slug,
          quantityLimitPerCustomer: variant.node.quantityLimitPerCustomer ?? null,
          quantityAvailable: variant.node.quantityAvailable ?? null,
          trackInventory: variant.node.trackInventory ?? true,
          isGiftDenom: giftDenom || undefined,
        }),
      );
      reachGoal(MetrikaGoal.addToCart, {
        variantId,
        slug: product.slug ?? undefined,
      });
      if (isFavoritesPathStrict(window.location.pathname, window.location.search)) {
        markCartFromFavorites();
      }
      toast.success(giftDenom ? 'Сертификат добавлен в корзину' : 'Товар добавлен в корзину');
    },
    [cartLines, dispatch, mainImage, product, toast],
  );

  const onVolumeSelect = useCallback(
    (option: VolumePickerOption) => {
      const variant = (product.productVariants ?? []).find((v) => v.node.id === option.id);
      if (variant) addVariantToCart(variant);
      setVolumeModalOpen(false);
    },
    [addVariantToCart, product.productVariants],
  );

  const addToBasketProps = useMemo(
    () => ({
      defaultText: outOfStock && !needsVolumePick ? 'НЕТ В НАЛИЧИИ' : 'В КОРЗИНУ',
      hoverText: outOfStock && !needsVolumePick ? 'НЕТ В НАЛИЧИИ' : 'В КОРЗИНУ',
      title: product.title,
      productType: (product.productType?.name || '').trim() || null,
      thumbnail: mainImage || '',
      price: product.price,
      oldPrice: product.oldPrice,
      discount: product.discount,
      size: activeVariant ? getVolumeFromVariant(activeVariant) : product.size || '',
      slug: product.slug,
      productId: isGiftCertificates ? undefined : productIdForFavorite,
      quantityLimitPerCustomer: quantityLimitForCard,
      quantityAvailable,
      trackInventory,
      minQuantity: activeVariant ? variantMinQty(activeVariant) : 1,
      disabled: needsVolumePick ? false : outOfStock,
      onRequestAdd: needsVolumePick ? openVolumeModal : undefined,
      preferAddButton: needsVolumePick,
    }),
    [
      activeVariant,
      isGiftCertificates,
      mainImage,
      needsVolumePick,
      openVolumeModal,
      outOfStock,
      product,
      productIdForFavorite,
      quantityAvailable,
      quantityLimitForCard,
      trackInventory,
    ],
  );

  return {
    volumeOptions,
    needsVolumePick,
    volumeModalOpen,
    openVolumeModal,
    closeVolumeModal,
    onVolumeSelect,
    addToBasketProps,
  };
}
