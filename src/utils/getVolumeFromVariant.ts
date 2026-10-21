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

/** Узел варианта (атрибуты / name). */
export type VolumeNodeLike = {
  name?: string | null;
  attributes?: VolumeAttr[] | null;
} | null | undefined;

/** Edge `{ node }` или сам узел — для mapProductNode / slices / карточек. */
export type VolumeVariantLike =
  | { node?: VolumeNodeLike }
  | NonNullable<VolumeNodeLike>
  | null
  | undefined;

function asVolumeNode(variant: VolumeVariantLike): VolumeNodeLike {
  if (!variant || typeof variant !== 'object') return null;
  if ('node' in variant) {
    return (variant as { node?: VolumeNodeLike }).node ?? null;
  }
  return variant as NonNullable<VolumeNodeLike>;
}

/** Объём / имя варианта для PDP, карточек, ATC, slices. */
export function getVolumeFromVariant(variant: VolumeVariantLike): string {
  const node = asVolumeNode(variant);
  if (!node) return '';

  if (node.attributes && Array.isArray(node.attributes)) {
    const volumeAttr = node.attributes.find((attr) => {
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
  }

  return node.name || '';
}
