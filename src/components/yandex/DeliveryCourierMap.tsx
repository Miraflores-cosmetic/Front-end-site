import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { resolveYandexGeoId, yandexGeoCenter } from '@/lib/yandexCityGeo';

declare global {
    interface Window {
        ymaps: any;
    }
}

export interface CourierMapSelection {
    lat: number;
    lon: number;
    geoLine?: string;
}

const YANDEX_MAP_API_KEY =
    import.meta.env.VITE_PUBLIC_YANDEX_MAP_API_KEY || import.meta.env.PUBLIC_YANDEX_MAP_API_KEY || '';

interface DeliveryCourierMapProps {
    cityHint: string;
    onChoose: (sel: CourierMapSelection) => void;
}

const DeliveryCourierMap: React.FC<DeliveryCourierMapProps> = ({ cityHint, onChoose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<unknown>(null);
    const placemarkRef = useRef<unknown>(null);
    const onChooseRef = useRef(onChoose);
    onChooseRef.current = onChoose;

    const [mapLoading, setMapLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!YANDEX_MAP_API_KEY) {
                setError('Укажите VITE_PUBLIC_YANDEX_MAP_API_KEY в .env для карты курьера');
                setMapLoading(false);
                return;
            }
            if (window.ymaps) {
                setMapLoading(false);
                return;
            }
            try {
                const existing = document.getElementById('yandex-maps-api-script');
                const script =
                    existing instanceof HTMLScriptElement ? existing : document.createElement('script');
                if (!existing) {
                    script.id = 'yandex-maps-api-script';
                    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAP_API_KEY}&lang=ru_RU`;
                    script.async = true;
                    document.head.appendChild(script);
                }
                await new Promise<void>((resolve, reject) => {
                    if (window.ymaps) resolve();
                    else {
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('Карта не загрузилась'));
                    }
                });
                await new Promise<void>((resolve) => window.ymaps.ready(() => resolve()));
                setMapLoading(false);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Ошибка карты');
                setMapLoading(false);
            }
        };
        void load();
    }, []);

    useEffect(() => {
        if (mapLoading || !window.ymaps || !containerRef.current) return;

        const gid = resolveYandexGeoId(cityHint) ?? 213;
        const center = yandexGeoCenter(gid);

        if (mapRef.current) {
            (mapRef.current as { destroy: () => void }).destroy();
            mapRef.current = null;
        }
        placemarkRef.current = null;

        const map = new window.ymaps.Map(containerRef.current, {
            center: [center.lat, center.lon],
            zoom: 12,
            controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
        });
        mapRef.current = map;

        const emitChoice = async (lat: number, lon: number) => {
            let geoLine: string | undefined;
            try {
                const gc = window.ymaps.geocode([lat, lon]);
                const geo = gc && typeof gc.then === 'function' ? await gc : gc;
                const first = geo?.geoObjects?.get?.(0);
                const text = first?.properties?.get?.('text');
                if (typeof text === 'string') geoLine = text;
            } catch {
                /* noop */
            }
            onChooseRef.current({ lat, lon, geoLine });
        };

        map.events.add(
            'click',
            (
                e: {
                    get: (k: string) => unknown;
                },
            ) => {
                const coords = e.get('coords') as number[];
                if (!coords?.length || coords.length < 2) return;
                const lat = coords[0];
                const lon = coords[1];

                if (placemarkRef.current) {
                    (map as { geoObjects: { remove: (x: unknown) => void } }).geoObjects.remove(
                        placemarkRef.current,
                    );
                }
                const Placemark = window.ymaps.Placemark;
                const pm = new Placemark(
                    [lat, lon],
                    {},
                    {
                        preset: 'islands#orangeCircleIcon',
                        draggable: true,
                    },
                );
                placemarkRef.current = pm;
                (map as { geoObjects: { add: (x: unknown) => void } }).geoObjects.add(pm);
                pm.events.add('dragend', () => {
                    const p = (pm as any).geometry.getCoordinates() as number[];
                    void emitChoice(p[0], p[1]);
                });

                void emitChoice(lat, lon);
            },
        );

        setMapReady(true);

        return () => {
            if (mapRef.current) {
                (mapRef.current as { destroy: () => void }).destroy();
                mapRef.current = null;
            }
        };
    }, [mapLoading, cityHint]);

    if (error) {
        return (
            <div style={{ border: '1px solid #fecaca', borderRadius: 12, padding: 16, background: '#fff7ed' }}>
                <MapPin style={{ width: 24, height: 24, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>
                Нажмите на карте точку адреса — координаты нужны для расчёта курьерской доставки. Можно перетащить метку.
            </p>
            <div style={{ position: 'relative', height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                {(mapLoading || !mapReady) && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.92)',
                            zIndex: 2,
                        }}
                    >
                        <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: '#ea580c' }} />
                    </div>
                )}
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
};

export default DeliveryCourierMap;
