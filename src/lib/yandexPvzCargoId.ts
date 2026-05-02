/**
 * Совпадает с рабочим проектом: для Cargo route_points нужен point_id отправителя/ПВЗ;
 * если id точки из API — UUID, в Cargo подставляют operator id.
 */

const HYPHENATED_UUID_RE =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[089ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function compactHex32(id: string): string {
    return id.replace(/-/g, '').toLowerCase();
}

function isCompactUuidV4(id: string): boolean {
    const c = compactHex32(id);
    return /^[0-9a-fA-F]{32}$/.test(c);
}

export function pickupPointOperatorId(raw: Record<string, unknown>): string {
    const oi = raw.operator_id;
    if (typeof oi === 'string' && oi.trim()) return oi.trim();
    const ids = raw.operator_ids;
    if (Array.isArray(ids) && ids.length > 0 && typeof ids[0] === 'string') return String(ids[0]).trim();
    const ops = raw.operators as unknown[] | undefined;
    const first =
        ops && typeof ops[0] === 'object' && ops[0] !== null
            ? (ops[0] as Record<string, unknown>).id ?? (ops[0] as Record<string, unknown>).operator_id
            : undefined;
    if (typeof first === 'string' && first.trim()) return first.trim();
    return '';
}

export function yandexPointIdForCargoOffers(pvz: { id: string; operatorId?: string }): string {
    const id = (pvz.id || '').trim();
    const op = (pvz.operatorId || '').trim();
    if (HYPHENATED_UUID_RE.test(id) && op) return op;
    if (isCompactUuidV4(id) && op) return op;
    return id || op;
}
