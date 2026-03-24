import { useState, useEffect, useRef } from 'react';
import type { CheckoutLine } from '@/types/checkout';
import type { AddressInfo } from '@/types/auth';
import { fetchVariantsShippingData } from '@/graphql/queries/variantShipping.service';

const FROM_CITY_CODE = Number(
    import.meta.env.VITE_CDEK_SHIP_FROM_CITY_CODE || '44',
);

function normalizePostalRu(s: string | undefined | null): string | null {
    if (!s) return null;
    const digits = s.replace(/\D/g, '');
    if (digits.length === 6) return digits;
    return null;
}

/**
 * Вес одной единицы × quantity — фактический вес отправления.
 * Габариты из Saleor — на одну единицу; при quantity > 1 масштабируем стороны в ∛q,
 * чтобы объём (и объёмный вес в калькуляторе СДЭК) рос пропорционально количеству.
 */
function packageDimsForQuantity(
    lengthCm: number,
    widthCm: number,
    heightCm: number,
    quantity: number,
): { length: number; width: number; height: number } {
    const q = Math.max(1, Math.floor(quantity) || 1);
    const l = Math.max(1, Math.round(lengthCm));
    const w = Math.max(1, Math.round(widthCm));
    const h = Math.max(1, Math.round(heightCm));
    if (q <= 1) {
        return { length: l, width: w, height: h };
    }
    const scale = Math.cbrt(q);
    return {
        length: Math.max(1, Math.round(l * scale)),
        width: Math.max(1, Math.round(w * scale)),
        height: Math.max(1, Math.round(h * scale)),
    };
}

function buildPackages(lines: CheckoutLine[], byVariant: Awaited<ReturnType<typeof fetchVariantsShippingData>>) {
    const packages: { weight: number; length: number; width: number; height: number }[] = [];
    for (const line of lines) {
        if (line.isGift) continue;
        const row = byVariant.get(line.variantId);
        const q = Math.max(1, Math.floor(line.quantity || 1));
        const unitWeightG = row?.weightGrams ?? 300;
        const weightG = unitWeightG * q;
        const baseL = row?.lengthCm ?? 20;
        const baseW = row?.widthCm ?? 15;
        const baseH = row?.heightCm ?? 10;
        const dims = packageDimsForQuantity(baseL, baseW, baseH, q);
        packages.push({
            weight: Math.max(1, Math.round(weightG)),
            ...dims,
        });
    }
    return packages;
}

function minDeliverySum(data: unknown): number | null {
    if (!data || typeof data !== 'object') return null;
    const raw = data as { tariff_codes?: Array<{ delivery_sum?: number; total_sum?: number }> };
    const list = raw.tariff_codes;
    if (!Array.isArray(list) || list.length === 0) return null;
    let min = Infinity;
    for (const t of list) {
        const sum = t?.delivery_sum ?? t?.total_sum;
        if (typeof sum === 'number' && sum >= 0 && sum < min) min = sum;
    }
    return min === Infinity ? null : min;
}

export function useCdekShippingEstimate(lines: CheckoutLine[], address: AddressInfo | null) {
    const [rub, setRub] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const seq = useRef(0);

    useEffect(() => {
        const id = ++seq.current;
        const run = async () => {
            setError(null);
            const payableLines = lines.filter((l) => !l.isGift);
            if (payableLines.length === 0) {
                setRub(null);
                setLoading(false);
                return;
            }
            if (!address) {
                setRub(null);
                setLoading(false);
                return;
            }

            const postal = normalizePostalRu(address.postalCode);
            if (!postal) {
                setRub(null);
                setError('Укажите индекс в адресе доставки для расчёта');
                return;
            }

            setLoading(true);
            try {
                const variantIds = payableLines.map((l) => l.variantId);
                const byVariant = await fetchVariantsShippingData(variantIds);
                const packages = buildPackages(payableLines, byVariant);
                if (packages.length === 0) {
                    if (id === seq.current) {
                        setRub(null);
                        setLoading(false);
                    }
                    return;
                }

                const body = {
                    type: 1,
                    currency: 1,
                    lang: 'rus',
                    from_location: { code: FROM_CITY_CODE },
                    to_location: {
                        postal_code: postal,
                        country_code: address.country?.code || 'RU',
                    },
                    packages,
                };

                const res = await fetch(`${window.location.origin}/api/cdek/calculator`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(
                        (json && (json.error as string)) ||
                            (json && (json.message as string)) ||
                            `CDEK ${res.status}`,
                    );
                }
                const sum = minDeliverySum(json);
                if (id === seq.current) {
                    if (sum == null) {
                        setRub(null);
                        setError('СДЭК не вернул тарифы для этого направления');
                    } else {
                        setRub(Math.round(sum));
                    }
                }
            } catch (e: unknown) {
                if (id === seq.current) {
                    setRub(null);
                    setError(e instanceof Error ? e.message : 'Ошибка расчёта доставки');
                }
            } finally {
                if (id === seq.current) setLoading(false);
            }
        };

        const t = window.setTimeout(run, 400);
        return () => window.clearTimeout(t);
    }, [lines, address]);

    return { rub, loading, error };
}
