/** Центры городов для выборки ПВЗ Ozon по радиусу (lat/lon). */
const OZON_CITY_CENTERS: Record<string, { lat: number; lon: number }> = {
    Москва: { lat: 55.7558, lon: 37.6173 },
    'Санкт-Петербург': { lat: 59.9343, lon: 30.3351 },
    Новосибирск: { lat: 55.0084, lon: 82.9357 },
    Екатеринбург: { lat: 56.8389, lon: 60.6057 },
    Казань: { lat: 55.7963, lon: 49.1088 },
    'Нижний Новгород': { lat: 56.2965, lon: 43.9361 },
    Челябинск: { lat: 55.1644, lon: 61.4368 },
    Самара: { lat: 53.1959, lon: 50.1002 },
    Омск: { lat: 54.9885, lon: 73.3242 },
    'Ростов-на-Дону': { lat: 47.2357, lon: 39.7015 },
    Уфа: { lat: 54.7388, lon: 55.9721 },
    Красноярск: { lat: 56.0153, lon: 92.8932 },
    Воронеж: { lat: 51.672, lon: 39.1843 },
    Пермь: { lat: 58.0105, lon: 56.2502 },
    Волгоград: { lat: 48.708, lon: 44.5133 },
    Краснодар: { lat: 45.0355, lon: 38.9753 },
    Саратов: { lat: 51.5336, lon: 46.0343 },
    Тюмень: { lat: 57.1522, lon: 65.5272 },
    Тольятти: { lat: 53.5078, lon: 49.4204 },
    Ижевск: { lat: 56.8527, lon: 53.2045 },
    Барнаул: { lat: 53.348, lon: 83.7798 },
    Иркутск: { lat: 52.2869, lon: 104.305 },
    Ульяновск: { lat: 54.3142, lon: 48.4031 },
    Хабаровск: { lat: 48.4827, lon: 135.0838 },
    Ярославль: { lat: 57.6261, lon: 39.8845 },
    Владивосток: { lat: 43.1155, lon: 131.8855 },
    Махачкала: { lat: 42.9849, lon: 47.5047 },
    Томск: { lat: 56.4977, lon: 84.9744 },
    Оренбург: { lat: 51.7682, lon: 55.097 },
    Кемерово: { lat: 55.3547, lon: 86.086 },
    Новокузнецк: { lat: 53.7576, lon: 87.1361 },
    Рязань: { lat: 54.6269, lon: 39.6916 },
    Астрахань: { lat: 46.3497, lon: 48.0408 },
    Пенза: { lat: 53.1959, lon: 45.0183 },
    Липецк: { lat: 52.6031, lon: 39.5708 },
    Киров: { lat: 58.6035, lon: 49.668 },
    Чебоксары: { lat: 56.1322, lon: 47.2519 },
    Калининград: { lat: 54.7104, lon: 20.4522 },
    Тула: { lat: 54.1931, lon: 37.6173 },
    Сочи: { lat: 43.6028, lon: 39.7342 },
    Курск: { lat: 51.7373, lon: 36.1874 },
    Ставрополь: { lat: 45.0428, lon: 41.9734 },
    Тверь: { lat: 56.8587, lon: 35.9176 },
    Магнитогорск: { lat: 53.4186, lon: 59.0472 },
    Иваново: { lat: 57.0004, lon: 40.9739 },
    Брянск: { lat: 53.2434, lon: 34.3654 },
    Белгород: { lat: 50.5951, lon: 36.5873 },
    Сургут: { lat: 61.254, lon: 73.3962 },
    Владимир: { lat: 56.1296, lon: 40.4066 },
    Архангельск: { lat: 64.5399, lon: 40.5158 },
    Чита: { lat: 52.0336, lon: 113.501 },
    Смоленск: { lat: 54.7826, lon: 32.0453 },
    Калуга: { lat: 54.5138, lon: 36.2612 },
    Саранск: { lat: 54.1874, lon: 45.1839 },
    'Набережные Челны': { lat: 55.7436, lon: 52.3958 },
};

const ALIASES: Record<string, string> = {
    спб: 'Санкт-Петербург',
    питер: 'Санкт-Петербург',
    'санкт петербург': 'Санкт-Петербург',
    мск: 'Москва',
    екб: 'Екатеринбург',
    нн: 'Нижний Новгород',
};

function normalizeKey(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/^(г\.|город)\s*/, '')
        .replace(/\s+/g, ' ');
}

export type OzonCityCenter = { city: string; lat: number; lon: number };

export function orderedOzonCityNames(): string[] {
    const priority = ['Москва', 'Санкт-Петербург'];
    const rest = Object.keys(OZON_CITY_CENTERS).filter((n) => !priority.includes(n));
    rest.sort((a, b) => a.localeCompare(b, 'ru'));
    return [...priority, ...rest];
}

export function resolveOzonCityCenter(cityName: string | null | undefined): OzonCityCenter | null {
    const norm = normalizeKey(cityName || '');
    if (!norm) return null;
    const alias = ALIASES[norm];
    const target = alias ? normalizeKey(alias) : norm;
    for (const [city, c] of Object.entries(OZON_CITY_CENTERS)) {
        if (normalizeKey(city) === target) return { city, lat: c.lat, lon: c.lon };
    }
    return null;
}
