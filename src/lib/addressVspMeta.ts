/**
 * Метаданные доставки во `streetAddress2`: первая строка `__VSP:...__`, далее — человекочитаемое описание.
 */

export type VspCarrier = 'yandex' | 'cdek';

export type VspDropoff = 'pvz' | 'courier';

export interface VspAddressMeta {
    carrier: VspCarrier;
    lon: string;
    lat: string;
    /** id пункта: Яндекс UUID / код ПВЗ СДЭК */
    pvz: string;
    /**
     * Яндекс: point_id для Cargo.
     * СДЭК: код города (city_code) для калькулятора.
     */
    cid: string;
    dropoff: VspDropoff;
}

const VSP_META_PREFIX = '__VSP:';

/** Первая строка streetAddress2 */
function parseFirstLine(streetAddress2: string | null | undefined): string {
    const s = streetAddress2 || '';
    const nl = s.indexOf('\n');
    return nl === -1 ? s.trim() : s.slice(0, nl).trim();
}

/** Всё после первой строки — комментарий/человекочитаемое */
function tailAfterMetaLine(full: string, metaLine: string): string {
    if (!full.startsWith(metaLine)) {
        const first = parseFirstLine(full);
        const idx = full.indexOf('\n');
        if (idx === -1) return '';
        return full.slice(idx + 1).trim();
    }
    const rest = full.slice(metaLine.length).trim();
    if (rest.startsWith('\n')) return rest.slice(1).trim();
    return rest;
}

function decodeMetaValue(raw: string): string {
    let v = raw;
    try {
        if (v) v = decodeURIComponent(v);
    } catch {
        /* noop */
    }
    return v;
}

export function parseVspAddressMeta(streetAddress2: string | null | undefined): VspAddressMeta | null {
    const line = parseFirstLine(streetAddress2);
    if (!line.startsWith(`${VSP_META_PREFIX}carrier=`)) return null;

    const inner = line.slice(VSP_META_PREFIX.length);
    const kv: Record<string, string> = {};
    for (const part of inner.split('|')) {
        const eq = part.indexOf('=');
        if (eq <= 0) continue;
        const k = part.slice(0, eq).trim();
        let v = part.slice(eq + 1).trim();
        if (v.endsWith('__')) v = v.slice(0, -2);
        kv[k] = v;
    }
    if (kv.carrier !== 'yandex' && kv.carrier !== 'cdek') return null;
    const dropoff = kv.dropoff === 'courier' ? 'courier' : 'pvz';
    return {
        carrier: kv.carrier,
        lon: kv.lon || '',
        lat: kv.lat || '',
        pvz: decodeMetaValue(kv.pvz || ''),
        cid: decodeMetaValue(kv.cid || ''),
        dropoff,
    };
}

/** Собирает первую строку меты (__VSP:...__). */
export function buildVspMetaLine(meta: VspAddressMeta): string {
    const { carrier, lon, lat, pvz, cid, dropoff } = meta;
    const cidPart =
        cid && cid.trim()
            ? `|cid=${encodeURIComponent(cid.trim())}`
            : '';
    return `${VSP_META_PREFIX}carrier=${carrier}|lon=${lon}|lat=${lat}|pvz=${encodeURIComponent(pvz)}|dropoff=${dropoff}${cidPart}__`;
}

export function buildStreetAddress2WithMeta(
    meta: VspAddressMeta,
    tail: string,
    maxLen = 500,
): string {
    const first = buildVspMetaLine(meta);
    // Никогда не режем meta mid-line — иначе parseVspAddressMeta ломается.
    if (first.length >= maxLen) return first;
    const comment = tail.trim();
    if (!comment) return first;
    const budget = maxLen - first.length - 1; // \n
    if (budget <= 0) return first;
    const clipped = comment.length <= budget ? comment : comment.slice(0, budget);
    return `${first}\n${clipped}`;
}

/** Код ПВЗ для Order.shippingAddress.pvzCode (СДЭК code / Яндекс point id). */
export function extractPvzCodeFromStreet2(
    streetAddress2: string | null | undefined,
): string | undefined {
    const meta = parseVspAddressMeta(streetAddress2);
    if (!meta || meta.dropoff !== 'pvz') return undefined;
    const code = (meta.carrier === 'yandex' ? meta.cid || meta.pvz : meta.pvz).trim();
    return code || undefined;
}

/** Освобождённое от меты первой строкой человекочитаемое содержимое */
export function humanTailFromStreet2(streetAddress2: string | null | undefined): string {
    const full = (streetAddress2 || '').trim();
    const meta = parseVspAddressMeta(full);
    if (!meta) return full;

    const firstLine = parseFirstLine(full);
    const merged = tailAfterMetaLine(full, firstLine);
    return merged;
}
