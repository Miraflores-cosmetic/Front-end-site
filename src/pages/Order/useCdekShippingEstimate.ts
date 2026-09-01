import { useState, useEffect, useRef, useMemo } from 'react';
import type { CheckoutLine } from '@/types/checkout';
import type { AddressInfo } from '@/types/auth';
import { fetchVariantsShippingData } from '@/graphql/queries/variantShipping.service';
import { parseVspAddressMeta } from '@/lib/addressVspMeta';
import { resolveCheckoutShippingMethod } from '@/utils/checkoutShipping';

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

type CdekTariffRow = {
    delivery_sum?: number;
    total_sum?: number;
    delivery_mode?: number;
    tariff_name?: string;
    tariff_code?: number;
    period_min?: number;
    period_max?: number;
};

export type ShippingEstimateMeta = {
    tariffId?: number | null;
    tariffName?: string | null;
    daysMin?: number | null;
    daysMax?: number | null;
    cost?: number | null;
    method?: 'CDEK' | 'YANDEX' | null;
};

/** CDEK delivery_mode: 3 склад-дверь, 4 склад-склад */
const CDEK_MODE_WAREHOUSE_DOOR = 3;
const CDEK_MODE_WAREHOUSE_WAREHOUSE = 4;

function tariffMatchesModes(t: CdekTariffRow, modes: number[]): boolean {
    if (typeof t.delivery_mode === 'number' && modes.includes(t.delivery_mode)) {
        return true;
    }
    const name = (t.tariff_name || '').toLowerCase();
    if (!name) return false;
    const wantPvz = modes.includes(CDEK_MODE_WAREHOUSE_WAREHOUSE);
    const wantDoor = modes.includes(CDEK_MODE_WAREHOUSE_DOOR);
    if (wantPvz && /склад\s*[-–—]?\s*склад/.test(name)) return true;
    if (wantDoor && /склад\s*[-–—]?\s*дверь/.test(name)) return true;
    return false;
}

/** Минимум среди тарифов нужного режима (ПВЗ ≠ дверь) + мета тарифа. */
function pickCheapestTariff(
    data: unknown,
    modes: number[],
): { sum: number; row: CdekTariffRow } | null {
    if (!data || typeof data !== 'object') return null;
    const raw = data as { tariff_codes?: CdekTariffRow[] };
    const list = raw.tariff_codes;
    if (!Array.isArray(list) || list.length === 0) return null;

    const filtered = list.filter((t) => tariffMatchesModes(t, modes));
    const anyTyped = list.some(
        (t) =>
            typeof t.delivery_mode === 'number' ||
            /склад\s*[-–—]?\s*(склад|дверь)/i.test(t.tariff_name || ''),
    );
    const pool = filtered.length > 0 ? filtered : anyTyped ? [] : list;
    if (pool.length === 0) return null;

    let best: CdekTariffRow | null = null;
    let min = Infinity;
    for (const t of pool) {
        const sum = t?.delivery_sum ?? t?.total_sum;
        if (typeof sum === 'number' && sum >= 0 && sum < min) {
            min = sum;
            best = t;
        }
    }
    if (!best || min === Infinity) return null;
    return { sum: min, row: best };
}

function isCdekPvzAddress(address: AddressInfo): boolean {
    const meta = parseVspAddressMeta(address.streetAddress2);
    if (meta?.carrier === 'cdek') return meta.dropoff === 'pvz';
    const s = address.streetAddress2 || '';
    if (/СДЭК\s*Курьер/i.test(s)) return false;
    if (/СДЭК\s*ПВЗ/i.test(s)) return true;
    // Без явного dropoff/ПВЗ — не угадываем склад-склад
    return false;
}

function useCdekOnlyEstimate(lines: CheckoutLine[], address: AddressInfo | null) {
    const [rub, setRub] = useState<number | null>(null);
    const [quoteMeta, setQuoteMeta] = useState<ShippingEstimateMeta | null>(null);
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
            if (payableLines.length === 0) {
                setRub(null);
                setQuoteMeta(null);
                setLoading(false);
                return;
            }
            if (!address) {
                setRub(null);
                setQuoteMeta(null);
                setLoading(false);
                return;
            }

            const method = resolveCheckoutShippingMethod(address.streetAddress2);
            if (method !== 'CDEK') {
                setRub(null);
                setQuoteMeta(null);
                setError(
                    method == null
                        ? 'Выберите способ доставки (СДЭК или Яндекс) в адресе'
                        : null,
                );
                setLoading(false);
                return;
            }

            const usePvz = isCdekPvzAddress(address);
            if (usePvz) {
                const pvzCode =
                    meta?.carrier === 'cdek' && meta.dropoff === 'pvz'
                        ? (meta.pvz || '').trim()
                        : '';
                if (!pvzCode) {
                    setRub(null);
                    setQuoteMeta(null);
                    setError('Выберите пункт выдачи СДЭК');
                    setLoading(false);
                    return;
                }
            }

            const postal = normalizePostalRu(address.postalCode);
            const cityCodeRaw =
                meta?.carrier === 'cdek' ? (meta.cid || '').trim() : '';
            const cityCode = cityCodeRaw ? Number(cityCodeRaw) : NaN;
            if (!postal && !(Number.isFinite(cityCode) && cityCode > 0)) {
                setRub(null);
                setQuoteMeta(null);
                setError('Укажите индекс в адресе доставки для расчёта');
                setLoading(false);
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

                const toLocation: Record<string, string | number> = {
                    country_code: address.country?.code || 'RU',
                };
                if (Number.isFinite(cityCode) && cityCode > 0) {
                    toLocation.code = cityCode;
                }
                if (postal) {
                    toLocation.postal_code = postal;
                }

                const body = {
                    type: 1,
                    currency: 1,
                    lang: 'rus',
                    from_location: { code: FROM_CITY_CODE },
                    to_location: toLocation,
                    packages,
                };

                const res = await fetch(`${window.location.origin}/api/cdek/service`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'calculator/tarifflist',
                        data: body,
                    }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(
                        (json && (json.error as string)) ||
                            (json && (json.message as string)) ||
                            `CDEK ${res.status}`,
                    );
                }
                const modes = usePvz
                    ? [CDEK_MODE_WAREHOUSE_WAREHOUSE]
                    : [CDEK_MODE_WAREHOUSE_DOOR];
                const picked = pickCheapestTariff(json, modes);
                if (id === seq.current) {
                    if (picked == null) {
                        setRub(null);
                        setQuoteMeta(null);
                        setError(
                            usePvz
                                ? 'СДЭК не вернул тариф до ПВЗ для этого направления'
                                : 'СДЭК не вернул тариф курьера для этого направления',
                        );
                    } else {
                        const sum = Math.round(picked.sum);
                        setRub(sum);
                        setQuoteMeta({
                            cost: sum,
                            method: 'CDEK',
                            tariffId:
                                typeof picked.row.tariff_code === 'number'
                                    ? picked.row.tariff_code
                                    : null,
                            tariffName: picked.row.tariff_name || null,
                            daysMin:
                                typeof picked.row.period_min === 'number'
                                    ? picked.row.period_min
                                    : null,
                            daysMax:
                                typeof picked.row.period_max === 'number'
                                    ? picked.row.period_max
                                    : null,
                        });
                    }
                }
            } catch (e: unknown) {
                if (id === seq.current) {
                    setRub(null);
                    setQuoteMeta(null);
                    setError(e instanceof Error ? e.message : 'Ошибка расчёта доставки');
                }
            } finally {
                if (id === seq.current) setLoading(false);
            }
        };

        const t = window.setTimeout(run, 400);
        return () => window.clearTimeout(t);
    }, [lines, address, meta]);

    return { rub, loading, error, quoteMeta };
}

function useYandexOnlyEstimate(lines: CheckoutLine[], address: AddressInfo | null) {
    const [rub, setRub] = useState<number | null>(null);
    const [quoteMeta, setQuoteMeta] = useState<ShippingEstimateMeta | null>(null);
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
                setQuoteMeta(null);
                setLoading(false);
                return;
            }

            const city = (address.city || '').trim();
            if (!city) {
                setRub(null);
                setQuoteMeta(null);
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
                setQuoteMeta(null);
                setError('Выберите пункт Яндекс Доставки');
                setLoading(false);
                return;
            }

            const fullname = (address.streetAddress1 || '').trim();
            if (!usePvz && !fullname) {
                setRub(null);
                setQuoteMeta(null);
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
                        const rounded = sum > 0 ? Math.round(sum) : 0;
                        setRub(rounded);
                        setQuoteMeta({
                            cost: rounded,
                            method: 'YANDEX',
                            tariffId: null,
                            tariffName: null,
                            daysMin: null,
                            daysMax: null,
                        });
                        setError(null);
                    }
                    return;
                }

                if (id === seq.current) {
                    setRub(null);
                    setQuoteMeta(null);
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
                    setQuoteMeta(null);
                    setError(e instanceof Error ? e.message : 'Ошибка расчёта доставки');
                }
            } finally {
                if (id === seq.current) setLoading(false);
            }
        };

        const t = window.setTimeout(run, 400);
        return () => window.clearTimeout(t);
    }, [lines, address, meta]);

    return { rub, loading, error, quoteMeta };
}

/**
 * Единый расчёт: СДЭК или Яндекс Доставка по явному типу в streetAddress2.
 */
export function useCdekShippingEstimate(lines: CheckoutLine[], address: AddressInfo | null) {
    const street2 = address?.streetAddress2;
    const method = resolveCheckoutShippingMethod(street2);
    const isYandex = method === 'YANDEX';
    const isCdek = method === 'CDEK';

    const cdekResult = useCdekOnlyEstimate(lines, isCdek ? address : null);

    const yandexResult = useYandexOnlyEstimate(lines, isYandex ? address : null);

    if (method == null && address) {
        return {
            rub: null as number | null,
            loading: false,
            error: 'Выберите способ доставки (СДЭК или Яндекс) в адресе',
            quoteMeta: null as ShippingEstimateMeta | null,
        };
    }

    if (isYandex) return yandexResult;
    return cdekResult;
}
