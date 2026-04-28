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

/** Одно место для Яндекс pricing: суммарный вес, макс. габариты по сторонам */
function buildYandexPlacesFromLines(
    lines: CheckoutLine[],
    byVariant: Awaited<ReturnType<typeof fetchVariantsShippingData>>,
) {
    const pkgs = buildPackages(lines, byVariant);
    if (pkgs.length === 0) return [];
    let maxL = 0;
    let maxW = 0;
    let maxH = 0;
    let sumW = 0;
    for (const p of pkgs) {
        sumW += p.weight;
        maxL = Math.max(maxL, p.length);
        maxW = Math.max(maxW, p.width);
        maxH = Math.max(maxH, p.height);
    }
    return [
        {
            physical_dims: {
                weight_gross: Math.max(1, sumW),
                dx: Math.max(1, maxL),
                dy: Math.max(1, maxH),
                dz: Math.max(1, maxW),
            },
        },
    ];
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

function parseYandexPricingTotal(data: unknown): number | null {
    if (!data || typeof data !== 'object') return null;
    const raw = data as { pricing_total?: string };
    const pt = raw.pricing_total;
    if (typeof pt !== 'string') return null;
    const m = pt.match(/^([\d.]+)/);
    if (!m) return null;
    const v = parseFloat(m[1]);
    return Number.isFinite(v) ? Math.round(v) : null;
}

/** Для простого текстового адреса без меты Яндекс — СДЭК (как раньше). */
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

            setLoading(true);
            try {
                const variantIds = payableLines.map((l) => l.variantId);
                const byVariant = await fetchVariantsShippingData(variantIds);
                const places = buildYandexPlacesFromLines(payableLines, byVariant);
                if (places.length === 0) {
                    if (id === seq.current) {
                        setRub(null);
                        setLoading(false);
                    }
                    return;
                }

                let body: Record<string, unknown>;

                if (meta.dropoff === 'pvz') {
                    const stationId = meta.pvz?.trim();
                    if (!stationId) {
                        if (id === seq.current) {
                            setRub(null);
                            setError('Выберите пункт Яндекс Доставки');
                            setLoading(false);
                        }
                        return;
                    }
                    body = {
                        tariff: 'self_pickup',
                        destination_station_id: stationId,
                        places,
                    };
                } else {
                    const city = (address.city || '').trim();
                    const line = (address.streetAddress1 || '').trim();
                    if (!city || !line) {
                        if (id === seq.current) {
                            setRub(null);
                            setError('Укажите город и адрес (улица, дом) для курьера');
                            setLoading(false);
                        }
                        return;
                    }
                    const destination_address = `${city}, ${line}`;
                    body = {
                        tariff: 'time_interval',
                        destination_address,
                        places,
                    };
                }

                const res = await fetch(`${window.location.origin}/api/yandex/pricing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const json = (await res.json().catch(() => ({}))) as {
                    error?: string;
                    message?: string;
                    description?: string;
                    hint?: string;
                };
                if (!res.ok) {
                    const base =
                        json.message ||
                        json.error ||
                        json.description ||
                        `Яндекс Доставка ${res.status}`;
                    const msg = json.hint ? `${base} ${json.hint}` : String(base);
                    throw new Error(msg);
                }
                const sum = parseYandexPricingTotal(json);
                if (id === seq.current) {
                    if (sum == null) {
                        setRub(null);
                        setError('Не удалось получить цену доставки Яндекс');
                    } else {
                        setRub(sum);
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
