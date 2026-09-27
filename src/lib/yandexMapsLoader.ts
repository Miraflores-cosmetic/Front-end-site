import { getYandexMapApiKey } from '@/lib/yandexMapApiKey';

let loading: Promise<any> | null = null;

/** Тот же script id, что у карт ПВЗ / курьера — скрипт грузится один раз. */
export function loadYandexMaps(): Promise<any> {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.ymaps) return new Promise((resolve) => window.ymaps.ready(() => resolve(window.ymaps)));
    if (loading) return loading;
    const key = getYandexMapApiKey();
    if (!key) return Promise.reject(new Error('Не задан ключ Яндекс Карт'));
    loading = new Promise((resolve, reject) => {
        const existing = document.getElementById('yandex-maps-api-script');
        const script =
            existing instanceof HTMLScriptElement ? existing : document.createElement('script');
        const done = () => window.ymaps.ready(() => resolve(window.ymaps));
        script.addEventListener('load', done, { once: true });
        script.addEventListener(
            'error',
            () => {
                loading = null;
                reject(new Error('Не удалось загрузить Яндекс Карты'));
            },
            { once: true },
        );
        if (!existing) {
            script.id = 'yandex-maps-api-script';
            script.src = `https://api-maps.yandex.ru/2.1/?apikey=${key}&lang=ru_RU`;
            script.async = true;
            document.head.appendChild(script);
        }
    });
    return loading;
}

/** Центр населённого пункта по названию (геокодер Яндекса). */
export async function geocodeCityCenter(
    city: string,
): Promise<{ city: string; lat: number; lon: number } | null> {
    const q = city.trim();
    if (!q) return null;
    try {
        const ymaps = await loadYandexMaps();
        const res = await ymaps.geocode(`Россия, ${q}`, { results: 1, kind: 'locality' });
        const first = res?.geoObjects?.get?.(0);
        const coords = first?.geometry?.getCoordinates?.();
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const name =
            (typeof first?.getLocalities === 'function' && first.getLocalities()?.[0]) ||
            first?.properties?.get?.('name') ||
            q;
        return { city: String(name), lat: Number(coords[0]), lon: Number(coords[1]) };
    } catch {
        return null;
    }
}
