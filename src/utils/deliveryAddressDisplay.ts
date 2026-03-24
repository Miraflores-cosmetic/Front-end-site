import type { AddressInfo } from '@/types/auth';

/**
 * Достаёт подпись способа из Saleor streetAddress2:
 * «Тип доставки: СДЭК ПВЗ. Детали: …»
 */
export function getDeliveryTypeLabelFromStreet2(street2: string | undefined | null): string {
    const s = (street2 || '').trim();
    if (!s) return 'Адрес';

    const prefix = 'Тип доставки:';
    const idx = s.indexOf(prefix);
    if (idx === -1) return 'Адрес';

    let rest = s.slice(idx + prefix.length).trim();
    if (!rest) return 'Адрес';

    const endDot = rest.indexOf('.');
    const endDetails = rest.indexOf('Детали:');
    let end = rest.length;
    if (endDot !== -1) end = Math.min(end, endDot);
    if (endDetails !== -1) end = Math.min(end, endDetails);

    const label = rest.slice(0, end).trim();
    return label || 'Адрес';
}

/** Одна строка адреса без повторов вроде «Москва, МОСКВА, …» */
export function formatProfileShippingAddressLine(address: AddressInfo): string {
    const parts = [address.countryArea, address.city, address.cityArea, address.streetAddress1, address.postalCode]
        .map((x) => (x != null ? String(x).trim() : ''))
        .filter(Boolean);

    const deduped: string[] = [];
    for (const p of parts) {
        const prev = deduped[deduped.length - 1];
        if (prev && prev.toLowerCase() === p.toLowerCase()) continue;
        deduped.push(p);
    }
    return deduped.join(', ');
}
