import { useState, useEffect, useRef, useMemo } from 'react';
import type { CheckoutLine } from '@/types/checkout';
import type { AddressInfo } from '@/types/auth';
import { fetchVariantsShippingData } from '@/graphql/queries/variantShipping.service';
import { parseVspAddressMeta } from '@/lib/addressVspMeta';

const FROM_CITY_CODE = Number(
    import.meta.env.VITE_CDEK_SHIP_FROM_CITY_CODE || '44',
);

function normalizePostalRu(s: string | undefined | null): string | null {
    if (!s) return null;
    const digits = s.replace(/\D/g, '');
    if (digits.length === 6) return digits;
    return null;
}

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

function parseYandexOfferPrice(raw: string | undefined): number {
    if (raw == null || raw === '') return 0;
    const normalized = String(raw).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
}

function getCheapestOffer(
    offers: Array<{ price?: { total_price?: string | undefined } }>,
): { price?: { total_price?: string | undefined } } | null {
    if (!offers?.length) return null;
    return offers.reduce((min, o) => {
        const price = parseYandexOfferPrice(o.price?.total_price);
        const minPrice = parseYandexOfferPrice(min.price?.total_price);
        return price < minPrice ? o : min;
    });
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
function useCdekOnlyEstimate(lines: CheckoutLine[], address: AddressInfo | null) {
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

function useYandexOnlyEstimate(lines: CheckoutLine[], address: AddressInfo | null) {
    const [rub, setRub] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const seq = useRef(0);

    const meta = useMemo(
        () => parseVspAddressMeta(address?.streetAddress2),
        [address?.streetAddress2],
    );

    useEffect(() => {
        const id = ++seq.current;
        const run = async () => {
            setError(null);
            const payableLines = lines.filter((l) => !l.isGift);
            if (payableLines.length === 0 || !address || !meta || meta.carrier !== 'yandex') {
                setRub(null);
                setLoading(false);
                return;
            }

            const city = (address.city || '').trim();
            if (!city) {
                setRub(null);
                setError('Укажите город для расчёта доставки');
                setLoading(false);
                return;
            }

            const usePvz =
                meta.dropoff === 'pvz' ||
                (meta.dropoff !== 'courier' && Boolean((meta.pvz || meta.cid)?.trim()));
            const pvzId = usePvz ? (meta.cid || meta.pvz || '').trim() : '';

            if (usePvz && !pvzId) {
                setRub(null);
                setError('Выберите пункт Яндекс Доставки');
                setLoading(false);
                return;
            }

            const fullname = (address.streetAddress1 || '').trim();
            if (!usePvz && !fullname) {
                setRub(null);
                setError('Укажите город и адрес (улица, дом) для курьера');
                setLoading(false);
                return;
            }

            const lonParsed = Number.parseFloat(meta.lon || '');
            const latParsed = Number.parseFloat(meta.lat || '');
            const coordinates =
                Number.isFinite(lonParsed) && Number.isFinite(latParsed)
                    ? ([lonParsed, latParsed] as [number, number])
                    : undefined;

            setLoading(true);
            try {
                const variantIds = payableLines.map((l) => l.variantId);
                const byVariant = await fetchVariantsShippingData(variantIds);
                const shipment_lines = payableLines.map((line) => {
                    const row = byVariant.get(line.variantId);
                    const q = Math.max(1, Math.floor(line.quantity || 1));
                    const wG = row?.weightGrams ?? 300;
                    const lCm = row?.lengthCm ?? 20;
                    const wCm = row?.widthCm ?? 15;
                    const hCm = row?.heightCm ?? 10;
                    return {
                        quantity: q,
                        weight_kg: wG / 1000,
                        length_mm: lCm * 10,
                        width_mm: wCm * 10,
                        height_mm: hCm * 10,
                    };
                });

                const body = {
                    action: 'calculate' as const,
                    mode: usePvz && pvzId ? ('pvz' as const) : ('door' as const),
                    to: {
                        city,
                        fullname,
                        ...(coordinates ? { coordinates } : {}),
                        ...(usePvz && pvzId ? { yandex_point_id: pvzId } : {}),
                    },
                    shipment_lines,
                };

                const res = await fetch(`${window.location.origin}/api/yandex-delivery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const json = (await res.json().catch(() => ({}))) as {
                    error?: string;
                    offers?: Array<{ price?: { total_price?: string } }>;
                };

                if (!res.ok) {
                    throw new Error(json.error || `Яндекс Доставка ${res.status}`);
                }

                const allOffers = json.offers || [];
                const positiveOffers = allOffers.filter(
                    (o) => parseYandexOfferPrice(o.price?.total_price) > 0,
                );
                const cheapest = getCheapestOffer(
                    positiveOffers.length > 0 ? positiveOffers : allOffers,
                );

                if (cheapest?.price?.total_price != null) {
                    const sum = parseYandexOfferPrice(cheapest.price.total_price);
                    if (id === seq.current) {
                        setRub(sum > 0 ? Math.round(sum) : 0);
                        setError(null);
                    }
                    return;
                }

                if (id === seq.current) {
                    setRub(null);
                    setError(
                        json.error ||
                            (Array.isArray(allOffers) && allOffers.length === 0
                                ? 'Не удалось получить тариф Яндекс Доставки для этого адреса'
                                : 'Не удалось получить цену доставки Яндекс'),
                    );
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
    }, [lines, address, meta]);

    return { rub, loading, error };
}

/**
 * Единый расчёт: СДЭК (как раньше) или Яндекс Доставка по мете __VSP__ в streetAddress2.
 */
export function useCdekShippingEstimate(lines: CheckoutLine[], address: AddressInfo | null) {
    const street2 = address?.streetAddress2;
    const isYandex = parseVspAddressMeta(street2)?.carrier === 'yandex';

    const cdekResult = useCdekOnlyEstimate(lines, !isYandex ? address : null);

    const yandexResult = useYandexOnlyEstimate(lines, isYandex ? address : null);

    if (isYandex) return yandexResult;
    return cdekResult;
}
