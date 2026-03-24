import { extractRuPostalCode } from '@/utils/extractRuPostalCode';

/** Формат пункта после прокси или сырого GET /deliverypoints (items). */
export interface NormalizedCdekPvz {
    code: string;
    name: string;
    address: string;
    city: string;
    city_code: number;
    postal_code?: string;
    work_time?: string;
    phone?: string;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
}

function asRecord(v: unknown): Record<string, unknown> {
    return v != null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/** Приводит элемент офиса СДЭК к одному виду и вытаскивает индекс из всех типичных полей. */
export function normalizeCdekPvzFromApi(raw: unknown): NormalizedCdekPvz {
    const r = asRecord(raw);
    const loc = asRecord(r.location);

    const address =
        (loc.address as string) ||
        (r.address as string) ||
        (loc.address_full as string) ||
        (r.address_full as string) ||
        '';

    const fullForPostal = [loc.address_full, address].filter(Boolean).join(' ');

    let pc: unknown = loc.postal_code ?? r.postal_code;
    if (pc == null || String(pc).trim() === '') {
        const codes = loc.postal_codes;
        if (Array.isArray(codes) && codes[0] != null) pc = codes[0];
    }

    let postalStr = pc != null && String(pc).trim() !== '' ? String(pc).trim() : '';
    if (!postalStr) {
        postalStr = extractRuPostalCode(String(loc.address_full || '')) || extractRuPostalCode(address);
    }

    const lat = loc.latitude ?? r.latitude;
    const lon = loc.longitude ?? r.longitude;

    const phones = r.phones;
    let phone = '';
    if (typeof r.phone === 'string' && r.phone) phone = r.phone;
    else if (Array.isArray(phones) && phones[0] != null && typeof phones[0] === 'object') {
        const p0 = phones[0] as Record<string, unknown>;
        phone = String(p0.number ?? '');
    }

    return {
        code: String(r.code ?? ''),
        name: String(r.name ?? ''),
        address,
        city: String(loc.city ?? r.city ?? ''),
        city_code: Number(loc.city_code ?? r.city_code ?? 0) || 0,
        postal_code: postalStr || undefined,
        work_time: r.work_time != null ? String(r.work_time) : undefined,
        phone,
        location:
            lat != null && lon != null
                ? {
                      latitude: Number(lat),
                      longitude: Number(lon),
                      address: String(loc.address_full || loc.address || address || ''),
                  }
                : undefined,
    };
}
