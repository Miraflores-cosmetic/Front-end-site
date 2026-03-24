/** Индекс РФ из строки адреса СДЭК / address_full. */
export function extractRuPostalCode(text: string | undefined | null): string {
    if (!text) return '';
    const t = String(text).trim();
    const patterns = [/^(\d{6})(?:[\s,]|$)/u, /,\s*(\d{6})\s*,/u, /,\s*(\d{6})\s*$/u, /\b(\d{6})\b/u];
    for (const re of patterns) {
        const m = t.match(re);
        if (m) return m[1];
    }
    return '';
}
