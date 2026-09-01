type VolumeAttrValue = {
  name?: string | null;
  plainText?: string | null;
  slug?: string | null;
};

type VolumeAttr = {
  attribute?: {
    slug?: string | null;
    name?: string | null;
  } | null;
  values?: VolumeAttrValue[] | null;
};

/** Минимальная форма варианта (productSlice / bestsellers card). */
type VolumeVariantLike = {
  node?: {
    name?: string | null;
    attributes?: VolumeAttr[] | null;
  } | null;
} | null | undefined;

/** Объём / имя варианта для PDP, карточек, ATC. */
export function getVolumeFromVariant(variant: VolumeVariantLike): string {
  if (!variant?.node?.attributes || !Array.isArray(variant.node.attributes)) {
    return variant?.node?.name || '';
  }

  const volumeAttr = variant.node.attributes.find((attr) => {
    const slug = attr.attribute?.slug?.toLowerCase() || '';
    const name = attr.attribute?.name?.toLowerCase() || '';
    return (
      slug === 'obem' ||
      slug === 'volume' ||
      name.includes('объем') ||
      name.includes('volume')
    );
  });

  if (volumeAttr) {
    const value = volumeAttr.values?.[0];
    if (value?.name) return value.name;
    if (value?.plainText) return value.plainText;
    if (value?.slug) return value.slug;
  }

  return variant?.node?.name || '';
}
