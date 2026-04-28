/** Справочник город → geo_id (Яндекс) для фильтра ПВЗ; без этого список по всей РФ слишком тяжёлый */

export const YANDEX_CITY_GEO_ID: Record<string, number> = {
    Москва: 213,
    'Санкт-Петербург': 2,
    Новосибирск: 65,
    Екатеринбург: 54,
    Казань: 43,
    'Нижний Новгород': 47,
    Челябинск: 56,
    Самара: 51,
    Омск: 66,
    'Ростов-на-Дону': 39,
    Уфа: 172,
    Красноярск: 62,
    Воронеж: 193,
    Пермь: 50,
    Волгоград: 38,
};

const ALIAS_TO_CANONICAL: Record<string, keyof typeof YANDEX_CITY_GEO_ID> = {
    спб: 'Санкт-Петербург',
    'с-пб': 'Санкт-Петербург',
    'с пб': 'Санкт-Петербург',
    питер: 'Санкт-Петербург',
    'санкт петербург': 'Санкт-Петербург',
};

function normalizeCityKey(s: string): string {
    return s.trim().replace(/\s+/g, ' ');
}

export function resolveYandexGeoId(userCity: string | undefined | null): number | null {
    const c = normalizeCityKey(userCity || '');
    if (!c) return null;
    if (YANDEX_CITY_GEO_ID[c]) return YANDEX_CITY_GEO_ID[c];
    const low = c.toLowerCase();
    const alias = ALIAS_TO_CANONICAL[low];
    if (alias && YANDEX_CITY_GEO_ID[alias]) return YANDEX_CITY_GEO_ID[alias];
    const found = Object.keys(YANDEX_CITY_GEO_ID).find(
        (k) => k.toLowerCase() === low || k.toLowerCase().includes(low) || low.includes(k.toLowerCase()),
    );
    return found ? YANDEX_CITY_GEO_ID[found] : null;
}

export function orderedYandexPvzCityNames(): string[] {
    const priority = ['Москва', 'Санкт-Петербург'];
    const rest = Object.keys(YANDEX_CITY_GEO_ID).filter((n) => !priority.includes(n));
    rest.sort((a, b) => a.localeCompare(b, 'ru'));
    return [...priority, ...rest];
}

export function catalogDisplayCityForUserCity(userCity: string | undefined | null): string {
    const id = resolveYandexGeoId(userCity);
    if (!id) return 'Москва';
    const entry = Object.entries(YANDEX_CITY_GEO_ID).find(([, v]) => v === id);
    return entry ? entry[0] : 'Москва';
}

/** Центры для карты по geo_id [lat, lon для API 2.x Placemark] */
const GEO_CENTER: Record<number, { lat: number; lon: number }> = {
    213: { lat: 55.7558, lon: 37.6173 },
    2: { lat: 59.9343, lon: 30.3351 },
    65: { lat: 55.0084, lon: 82.9357 },
    54: { lat: 56.8389, lon: 60.6057 },
    43: { lat: 55.7887, lon: 49.1221 },
    47: { lat: 56.3269, lon: 44.0065 },
    56: { lat: 55.1644, lon: 61.4368 },
    51: { lat: 53.2001, lon: 50.15 },
    66: { lat: 54.9885, lon: 73.3242 },
    39: { lat: 47.2357, lon: 39.7015 },
    172: { lat: 54.7388, lon: 55.9721 },
    62: { lat: 56.0184, lon: 92.8672 },
    193: { lat: 51.672, lon: 39.1843 },
    50: { lat: 58.0105, lon: 56.2502 },
    38: { lat: 48.7194, lon: 44.5018 },
};

export function yandexGeoCenter(geoId: number): { lat: number; lon: number } {
    return GEO_CENTER[geoId] || GEO_CENTER[213];
}
