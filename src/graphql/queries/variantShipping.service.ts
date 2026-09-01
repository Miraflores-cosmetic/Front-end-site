/** Габариты для расчёта доставки — дефолты (Nest public API не отдаёт metadata варианта). */

export type VariantShippingRow = {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

const DEFAULT: VariantShippingRow = {
  weightGrams: 300,
  lengthCm: 20,
  widthCm: 15,
  heightCm: 10,
};

export async function fetchVariantsShippingData(
  variantIds: string[],
): Promise<Map<string, VariantShippingRow>> {
  const map = new Map<string, VariantShippingRow>();
  for (const id of variantIds) {
    map.set(id, { ...DEFAULT });
  }
  return map;
}
