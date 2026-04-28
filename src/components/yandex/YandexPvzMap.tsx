import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, MapPin } from 'lucide-react';

declare global {
    interface Window {
        ymaps: any;
        selectYandexPvz?: (id: string) => void;
    }
}

export interface YandexPvzBrief {
    id: string;
    name: string;
    addressLine: string;
    city: string;
    postalCode?: string;
    region?: string;
    lat: number;
    lon: number;
}

interface YandexPvzMapProps {
    pvzList: YandexPvzBrief[];
    selectedCity: { city: string; latitude?: number; longitude?: number } | null;
    onSelect: (pvz: YandexPvzBrief) => void;
    loading?: boolean;
}

const YANDEX_MAP_API_KEY =
    import.meta.env.VITE_PUBLIC_YANDEX_MAP_API_KEY || import.meta.env.PUBLIC_YANDEX_MAP_API_KEY || '';

/** Карта пунктов Яндекс Доставки — по паттерну YandexCdekMap */
const YandexPvzMap: React.FC<YandexPvzMapProps> = ({
    pvzList,
    selectedCity,
    onSelect,
    loading = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const clustererRef = useRef<any>(null);
    const [mapLoading, setMapLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPvz, setSelectedPvz] = useState<YandexPvzBrief | null>(null);

    useEffect(() => {
        const loadYandexMaps = async () => {
            if (!YANDEX_MAP_API_KEY) {
                setError(
                    'Не указан API ключ Яндекс Карт. Проверьте VITE_PUBLIC_YANDEX_MAP_API_KEY в .env',
                );
                setMapLoading(false);
                return;
            }

            if (window.ymaps) {
                setMapLoading(false);
                return;
            }

            try {
                const existingScript = document.getElementById('yandex-maps-api-script');
                const script =
                    existingScript instanceof HTMLScriptElement
                        ? existingScript
                        : document.createElement('script');

                if (!existingScript) {
                    script.id = 'yandex-maps-api-script';
                    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAP_API_KEY}&lang=ru_RU`;
                    script.async = true;
                }

                await new Promise<void>((resolve, reject) => {
                    if (window.ymaps) {
                        resolve();
                        return;
                    }
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Не удалось загрузить Яндекс Карты'));
                    if (!existingScript) {
                        document.head.appendChild(script);
                    }
                });

                await new Promise<void>((resolve) => {
                    window.ymaps.ready(() => resolve());
                });

                setMapLoading(false);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Ошибка загрузки карты');
                setMapLoading(false);
            }
        };

        loadYandexMaps();
    }, []);

    useEffect(() => {
        if (mapLoading || !window.ymaps || !containerRef.current) return;

        const initMap = () => {
            setMapReady(false);

            if (mapRef.current) {
                mapRef.current.destroy();
                mapRef.current = null;
            }

            const center =
                selectedCity?.latitude && selectedCity?.longitude
                    ? [selectedCity.latitude, selectedCity.longitude]
                    : [55.751574, 37.573856];

            mapRef.current = new window.ymaps.Map(
                containerRef.current,
                {
                    center,
                    zoom: 12,
                    controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
                },
                {
                    suppressMapOpenBlock: true,
                },
            );

            clustererRef.current = new window.ymaps.Clusterer({
                preset: 'islands#orangeClusterIcons',
                groupByCoordinates: false,
                clusterDisableClickZoom: false,
                clusterHideIconOnBalloonOpen: false,
                geoObjectHideIconOnBalloonOpen: false,
            });

            mapRef.current.geoObjects.add(clustererRef.current);

            setMapReady(true);
        };

        window.ymaps.ready(initMap);

        return () => {
            if (mapRef.current) {
                mapRef.current.destroy();
                mapRef.current = null;
            }
        };
    }, [mapLoading, selectedCity]);

    useEffect(() => {
        if (!mapReady || !mapRef.current || !clustererRef.current) {
            return;
        }

        clustererRef.current.removeAll();

        const valid = pvzList.filter((p) => p.lat && p.lon);
        if (valid.length === 0) {
            return;
        }

        const placemarks = valid.map((pvz) => {
            const safeId = String(pvz.id).replace(/'/g, "\\'");
            const placemark = new window.ymaps.Placemark(
                [pvz.lat, pvz.lon],
                {
                    balloonContentHeader: `<strong>${pvz.name || 'Пункт выдачи'}</strong>`,
                    balloonContentBody: `
            <div style="padding: 8px 0;">
              <div style="color: #666; margin-bottom: 8px;">📍 ${pvz.addressLine || 'Адрес не указан'}</div>
            </div>
          `,
                    balloonContentFooter: `
            <button 
              onclick="window.selectYandexPvz && window.selectYandexPvz('${safeId}')"
              style="
                background: #ea580c; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 8px; 
                cursor: pointer;
                font-weight: 500;
                width: 100%;
              "
            >
              Выбрать этот пункт
            </button>
          `,
                    hintContent: pvz.name || 'ПВЗ',
                },
                {
                    preset: 'islands#orangeDotIcon',
                    iconColor: '#ea580c',
                },
            );

            placemark.events.add('click', () => {
                setSelectedPvz(pvz);
            });

            return placemark;
        });

        clustererRef.current.add(placemarks);

        if (placemarks.length > 0) {
            mapRef.current
                .setBounds(clustererRef.current.getBounds(), {
                    checkZoomRange: true,
                    zoomMargin: 50,
                })
                .catch(() => {});
        }
    }, [pvzList, mapReady]);

    useEffect(() => {
        window.selectYandexPvz = (id: string) => {
            const pvz = pvzList.find((p) => String(p.id) === String(id));
            if (pvz) {
                setSelectedPvz(pvz);
                onSelect(pvz);
                if (mapRef.current) {
                    mapRef.current.balloon.close();
                }
            }
        };

        return () => {
            delete window.selectYandexPvz;
        };
    }, [pvzList, onSelect]);

    const handleSelect = useCallback(() => {
        if (selectedPvz) {
            onSelect(selectedPvz);
        }
    }, [selectedPvz, onSelect]);

    if (error) {
        return (
            <div
                style={{
                    border: '1px solid #fca5a5',
                    background: '#fef2f2',
                    borderRadius: '12px',
                    padding: '16px',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <MapPin style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: '#f87171' }} />
                    <div style={{ fontSize: '14px', color: '#dc2626' }}>{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
                ref={containerRef}
                style={{
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#f3f4f6',
                    height: '400px',
                    position: 'relative',
                }}
            >
                {(mapLoading || loading) && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.8)',
                            zIndex: 10,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#ea580c' }} />
                            <span style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)' }}>
                                {mapLoading ? 'Загрузка Яндекс Карт...' : 'Загрузка пунктов выдачи...'}
                            </span>
                        </div>
                    </div>
                )}

                {!mapLoading && !loading && pvzList.filter((p) => p.lat && p.lon).length === 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                            <MapPin style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: 'rgba(0,0,0,0.3)' }} />
                            <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)' }}>
                                Нет пунктов с координатами в этом городе
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedPvz && (
                <div
                    style={{
                        border: '1px solid #fdba74',
                        background: '#fff7ed',
                        borderRadius: '12px',
                        padding: '16px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                        <div style={{ padding: '8px', background: '#ffedd5', borderRadius: '8px', flexShrink: 0 }}>
                            <MapPin style={{ width: '20px', height: '20px', color: '#ea580c' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#9a3412' }}>
                                {selectedPvz.name || 'Пункт выдачи'}
                            </div>
                            <div style={{ fontSize: '14px', color: '#c2410c', marginTop: '4px' }}>
                                {selectedPvz.addressLine}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSelect}
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            height: '40px',
                            background: '#ea580c',
                            color: 'white',
                            borderRadius: '8px',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Выбрать этот пункт
                    </button>
                </div>
            )}
        </div>
    );
};

export default YandexPvzMap;
