import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, ChevronDown, Map, Search } from 'lucide-react';
import {
    orderedYandexPvzCityNames,
    YANDEX_CITY_GEO_ID,
    catalogDisplayCityForUserCity,
    yandexGeoCenter,
} from '@/lib/yandexCityGeo';
import YandexPvzMap, { type YandexPvzBrief } from './YandexPvzMap';
import { pickupPointOperatorId } from '@/lib/yandexPvzCargoId';

interface YandexPvzListProps {
    onChoose: (info: YandexPvzBrief) => void;
    /** Город из формы адреса (подсказка при первом открытии) */
    defaultCity?: string;
    initialMode?: 'list' | 'map';
}

export type { YandexPvzBrief };

function normalizePvzApi(raw: Record<string, unknown>): YandexPvzBrief | null {
    const id = raw.id != null ? String(raw.id) : '';
    const pos = raw.position as { latitude?: number; longitude?: number } | undefined;
    const lat = pos?.latitude;
    const lon = pos?.longitude;
    if (!id || typeof lat !== 'number' || typeof lon !== 'number') return null;
    const addr = raw.address as Record<string, unknown> | undefined;
    const full =
        typeof addr?.full_address === 'string'
            ? addr.full_address
            : typeof addr?.locality === 'string'
              ? String(addr.locality)
              : '';
    const locality = typeof addr?.locality === 'string' ? addr.locality : '';
    const region =
        typeof addr?.region === 'string'
            ? addr.region
            : typeof addr?.subRegion === 'string'
              ? addr.subRegion
              : '';
    const postal = typeof addr?.postal_code === 'string' ? addr.postal_code : '';
    const name = typeof raw.name === 'string' ? raw.name : 'Пункт выдачи';
    const operatorId = pickupPointOperatorId(raw);
    return {
        id,
        ...(operatorId ? { operatorId } : {}),
        name,
        addressLine: full || name,
        city: locality,
        postalCode: postal,
        region,
        lat,
        lon,
    };
}

const YandexPvzList: React.FC<YandexPvzListProps> = ({
    onChoose,
    defaultCity = 'Москва',
    initialMode = 'map',
}) => {
    const allCityNames = useMemo(() => orderedYandexPvzCityNames(), []);
    const initialName = useMemo(
        () => catalogDisplayCityForUserCity(defaultCity),
        [defaultCity],
    );
    const [selectedCityName, setSelectedCityName] = useState(initialName);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    const [pvzList, setPvzList] = useState<YandexPvzBrief[]>([]);
    const [pvzLoading, setPvzLoading] = useState(false);
    const [pvzError, setPvzError] = useState<string | null>(null);
    const [pvzSearchQuery, setPvzSearchQuery] = useState('');
    const [showWidget, setShowWidget] = useState(initialMode === 'map');

    useEffect(() => {
        setShowWidget(initialMode === 'map');
    }, [initialMode]);

    const geoId = YANDEX_CITY_GEO_ID[selectedCityName] ?? 213;
    const cityCenterForMap = useMemo(() => {
        const c = yandexGeoCenter(geoId);
        return { city: selectedCityName, latitude: c.lat, longitude: c.lon };
    }, [geoId, selectedCityName]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setPvzLoading(true);
            setPvzError(null);
            setPvzList([]);
            try {
                const res = await fetch(`${window.location.origin}/api/yandex-delivery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'list-pickup-points',
                        geo_id: geoId,
                    }),
                });
                const json = (await res.json().catch(() => ({}))) as {
                    points?: unknown[];
                    error?: string;
                    message?: string;
                };
                if (!res.ok) {
                    throw new Error(
                        json.error || json.message || `Ошибка ПВЗ Яндекс ${res.status}`,
                    );
                }
                const rawPoints = Array.isArray(json.points) ? json.points : [];
                const list: YandexPvzBrief[] = [];
                for (const p of rawPoints) {
                    if (p && typeof p === 'object') {
                        const n = normalizePvzApi(p as Record<string, unknown>);
                        if (n) list.push(n);
                    }
                }
                if (!cancelled) setPvzList(list);
            } catch (e: unknown) {
                if (!cancelled) {
                    setPvzError(e instanceof Error ? e.message : 'Ошибка загрузки ПВЗ');
                }
            } finally {
                if (!cancelled) setPvzLoading(false);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [geoId]);

    const filteredCities = useMemo(() => {
        const q = citySearchQuery.trim().toLowerCase();
        if (!q) return allCityNames;
        return allCityNames.filter((c) => c.toLowerCase().includes(q));
    }, [allCityNames, citySearchQuery]);

    const filteredPvz = useMemo(() => {
        const q = pvzSearchQuery.trim().toLowerCase();
        if (!q) return pvzList;
        return pvzList.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.addressLine.toLowerCase().includes(q) ||
                p.city.toLowerCase().includes(q),
        );
    }, [pvzList, pvzSearchQuery]);

    const handleMapSelect = useCallback(
        (p: YandexPvzBrief) => {
            onChoose(p);
        },
        [onChoose],
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                    Город
                </label>
                <button
                    type="button"
                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                    style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                    }}
                >
                    <span>{selectedCityName}</span>
                    <ChevronDown style={{ width: '18px', height: '18px', opacity: 0.5 }} />
                </button>
                {showCityDropdown && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 4,
                            maxHeight: 240,
                            overflowY: 'auto',
                            background: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: 12,
                            zIndex: 20,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        }}
                    >
                        <div style={{ padding: 8 }}>
                            <input
                                type="text"
                                value={citySearchQuery}
                                onChange={(e) => setCitySearchQuery(e.target.value)}
                                placeholder="Поиск города"
                                style={{
                                    width: '100%',
                                    height: 40,
                                    padding: '0 12px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(0,0,0,0.1)',
                                }}
                            />
                        </div>
                        {filteredCities.map((city) => (
                            <button
                                key={city}
                                type="button"
                                onClick={() => {
                                    setSelectedCityName(city);
                                    setShowCityDropdown(false);
                                    setCitySearchQuery('');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    background: selectedCityName === city ? 'rgba(234,88,12,0.08)' : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {pvzError && (
                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: 14,
                    }}
                >
                    {pvzError}
                </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    type="button"
                    onClick={() => setShowWidget(false)}
                    style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: !showWidget ? '#ea580c' : '#f3f4f6',
                        color: !showWidget ? 'white' : 'rgba(0,0,0,0.6)',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <Search style={{ width: 16, height: 16 }} />
                    Список
                </button>
                <button
                    type="button"
                    onClick={() => setShowWidget(true)}
                    style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: showWidget ? '#ea580c' : '#f3f4f6',
                        color: showWidget ? 'white' : 'rgba(0,0,0,0.6)',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <Map style={{ width: 16, height: 16 }} />
                    Карта
                </button>
            </div>

            {showWidget ? (
                <YandexPvzMap
                    pvzList={pvzList}
                    selectedCity={cityCenterForMap}
                    onSelect={handleMapSelect}
                    loading={pvzLoading}
                />
            ) : (
                <>
                    <div>
                        <label
                            style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <Search style={{ width: 16, height: 16 }} />
                            Поиск пункта
                        </label>
                        <input
                            type="text"
                            value={pvzSearchQuery}
                            onChange={(e) => setPvzSearchQuery(e.target.value)}
                            placeholder="Адрес или название"
                            style={{
                                height: 48,
                                padding: '0 16px',
                                borderRadius: 12,
                                border: '1px solid rgba(0,0,0,0.1)',
                                width: '100%',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                        {pvzLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16 }}>
                                <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} />
                                <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>Загрузка…</span>
                            </div>
                        )}
                        {!pvzLoading &&
                            filteredPvz.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => onChoose(p)}
                                    style={{
                                        textAlign: 'left',
                                        padding: 16,
                                        borderRadius: 12,
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        background: 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                                    <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.65)' }}>{p.addressLine}</div>
                                    {p.postalCode && (
                                        <div style={{ fontSize: 12, marginTop: 6, color: 'rgba(0,0,0,0.45)' }}>
                                            Индекс {p.postalCode}
                                        </div>
                                    )}
                                </button>
                            ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default YandexPvzList;
