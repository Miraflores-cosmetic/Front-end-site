/**
 * Метаданные доставки во `streetAddress2`: первая строка `__VSP:...__`, далее — человекочитаемое описание (как для СДЭК).
 */

export type VspCarrier = 'yandex';

export type VspDropoff = 'pvz' | 'courier';

export interface VspAddressMeta {
    carrier: VspCarrier;
    lon: string;
    lat: string;
    /** id строки пункта из pickup-points/list (для совпадения с картой) */
    pvz: string;
    /**
     * point_id для Cargo / yandex_point_id для Platform калькулятора (часто operator id вместо UUID).
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
    if (kv.carrier !== 'yandex') return null;
    const dropoff = kv.dropoff === 'courier' ? 'courier' : 'pvz';
    let pvzDecoded = kv.pvz || '';
    let cidDecoded = kv.cid || '';
    try {
        if (pvzDecoded) pvzDecoded = decodeURIComponent(pvzDecoded);
    } catch {
        /* noop */
    }
    try {
        if (cidDecoded) cidDecoded = decodeURIComponent(cidDecoded);
    } catch {
        /* noop */
    }
    return {
        carrier: 'yandex',
        lon: kv.lon || '',
        lat: kv.lat || '',
        pvz: pvzDecoded,
        cid: cidDecoded,
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

export function buildStreetAddress2WithMeta(meta: VspAddressMeta, tail: string): string {
    const first = buildVspMetaLine(meta);
    const comment = tail.trim();
    if (!comment) return first.slice(0, 256);
    const combined = `${first}\n${comment}`;
    return combined.length <= 256 ? combined : combined.slice(0, 256);
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
