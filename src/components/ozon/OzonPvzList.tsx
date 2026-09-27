import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock, Loader2, Map as MapIcon, MapPin, Search } from 'lucide-react';
import { apiJson, ApiError } from '@/api/apiClient';
import YandexPvzMap, { OZON_PVZ_PALETTE, type YandexPvzBrief } from '@/components/yandex/YandexPvzMap';
import { orderedOzonCityNames, resolveOzonCityCenter, type OzonCityCenter } from '@/lib/ozonCityCenters';
import { geocodeCityCenter } from '@/lib/yandexMapsLoader';
import { setOzonAvailability } from '@/lib/carrierAvailability';
import styles from './OzonPvzList.module.scss';

export type OzonPickupPoint = {
    id: string;
    name: string;
    type: string;
    address: string;
    city: string;
    region: string;
    postalCode: string;
    lat: number;
    lon: number;
    workingHours: string | null;
};

interface OzonPvzListProps {
    onChoose: (point: OzonPickupPoint) => void;
    defaultCity?: string;
    selectedId?: string | null;
    initialMode?: 'list' | 'map';
}

const FALLBACK_CITY: OzonCityCenter = { city: 'Москва', lat: 55.7558, lon: 37.6173 };

function typeLabel(type: string): string | null {
    if (/postamat/i.test(type)) return 'Постамат';
    return null;
}

function toBrief(p: OzonPickupPoint): YandexPvzBrief {
    return {
        id: p.id,
        name: p.name,
        addressLine: p.address,
        city: p.city,
        postalCode: p.postalCode,
        region: p.region,
        lat: p.lat,
        lon: p.lon,
        ...(p.workingHours ? { hint: p.workingHours } : {}),
    };
}

type OzonPickupPointsResponse = {
    available?: boolean;
    degraded?: boolean;
    message?: string | null;
    points?: OzonPickupPoint[];
};

const UNAVAILABLE_TEXT =
    'Ozon Доставка временно недоступна. Попробуйте позже или выберите другую службу.';

function errorText(e: unknown): string {
    if (e instanceof ApiError && e.status >= 500) return UNAVAILABLE_TEXT;
    if (e instanceof TypeError) return 'Нет связи с сервером. Проверьте интернет и повторите.';
    return e instanceof Error ? e.message : 'Не удалось загрузить пункты выдачи';
}

const OzonPvzList: React.FC<OzonPvzListProps> = ({
    onChoose,
    defaultCity = 'Москва',
    selectedId = null,
    initialMode = 'map',
}) => {
    const cityNames = useMemo(() => orderedOzonCityNames(), []);
    const [center, setCenter] = useState<OzonCityCenter | null>(
        () => resolveOzonCityCenter(defaultCity),
    );
    const [cityQuery, setCityQuery] = useState('');
    const [cityOpen, setCityOpen] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [cityError, setCityError] = useState<string | null>(null);

    const [points, setPoints] = useState<OzonPickupPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [search, setSearch] = useState('');
    const [mode, setMode] = useState<'list' | 'map'>(initialMode);
    const cityBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        const known = resolveOzonCityCenter(defaultCity);
        if (known) {
            setCenter(known);
            return;
        }
        if (!defaultCity.trim()) {
            setCenter(FALLBACK_CITY);
            return;
        }
        void geocodeCityCenter(defaultCity).then((c) => {
            if (!cancelled) setCenter(c ?? FALLBACK_CITY);
        });
        return () => {
            cancelled = true;
        };
    }, [defaultCity]);

    useEffect(() => {
        if (!cityOpen) return;
        const onDown = (e: MouseEvent) => {
            if (!cityBoxRef.current?.contains(e.target as Node)) setCityOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [cityOpen]);

    useEffect(() => {
        if (!center) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setPoints([]);
        apiJson<OzonPickupPointsResponse>(
            '/delivery/ozon/pickup-points',
            'POST',
            { lat: center.lat, lon: center.lon },
            { skipUnauthorizedNotify: true },
        )
            .then((res) => {
                if (cancelled) return;
                if (res.available === false) {
                    setOzonAvailability({ available: false, message: res.message ?? null });
                    setError(res.message || UNAVAILABLE_TEXT);
                    return;
                }
                if (res.degraded) {
                    setError(res.message || UNAVAILABLE_TEXT);
                    return;
                }
                setPoints(Array.isArray(res.points) ? res.points : []);
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(errorText(e));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [center, reloadKey]);

    const filteredCities = useMemo(() => {
        const q = cityQuery.trim().toLowerCase();
        if (!q) return cityNames;
        return cityNames.filter((c) => c.toLowerCase().includes(q));
    }, [cityNames, cityQuery]);

    const pickCity = useCallback((name: string) => {
        const known = resolveOzonCityCenter(name);
        if (known) {
            setCenter(known);
            setCityOpen(false);
            setCityQuery('');
            setCityError(null);
            return;
        }
        setGeocoding(true);
        setCityError(null);
        void geocodeCityCenter(name)
            .then((c) => {
                if (c) {
                    setCenter(c);
                    setCityOpen(false);
                    setCityQuery('');
                } else {
                    setCityError('Город не найден — уточните название');
                }
            })
            .finally(() => setGeocoding(false));
    }, []);

    const filteredPoints = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return points;
        return points.filter(
            (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
        );
    }, [points, search]);

    const briefs = useMemo(() => points.map(toBrief), [points]);
    const byId = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);
    const mapCity = useMemo(
        () => (center ? { city: center.city, latitude: center.lat, longitude: center.lon } : null),
        [center],
    );
    const handleMapSelect = useCallback(
        (b: YandexPvzBrief) => {
            const p = byId.get(b.id);
            if (p) onChoose(p);
        },
        [byId, onChoose],
    );

    const query = cityQuery.trim();
    const showGeocodeOption =
        query.length >= 2 && !filteredCities.some((c) => c.toLowerCase() === query.toLowerCase());

    return (
        <div className={styles.root}>
            <div className={styles.cityBox} ref={cityBoxRef}>
                <span className={styles.label}>Город</span>
                <button
                    type="button"
                    className={styles.cityButton}
                    onClick={() => setCityOpen((v) => !v)}
                    aria-expanded={cityOpen}
                >
                    <span>{center?.city ?? 'Определяем…'}</span>
                    <ChevronDown className={styles.chevron} data-open={cityOpen || undefined} />
                </button>
                {cityOpen && (
                    <div className={styles.cityDropdown}>
                        <input
                            className={styles.cityInput}
                            value={cityQuery}
                            onChange={(e) => {
                                setCityQuery(e.target.value);
                                setCityError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && query) {
                                    e.preventDefault();
                                    pickCity(filteredCities[0] ?? query);
                                }
                            }}
                            placeholder="Поиск города"
                            autoFocus
                        />
                        <div className={styles.cityList}>
                            {showGeocodeOption && (
                                <button
                                    type="button"
                                    className={styles.cityOption}
                                    onClick={() => pickCity(query)}
                                    disabled={geocoding}
                                >
                                    {geocoding ? (
                                        <Loader2 className={styles.spin} />
                                    ) : (
                                        <Search className={styles.optionIcon} />
                                    )}
                                    Найти «{query}»
                                </button>
                            )}
                            {filteredCities.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={styles.cityOption}
                                    data-active={center?.city === c || undefined}
                                    onClick={() => pickCity(c)}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                        {cityError && <p className={styles.cityError}>{cityError}</p>}
                    </div>
                )}
            </div>

            <div className={styles.modeSwitch} role="tablist" aria-label="Вид">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'map'}
                    className={styles.modeBtn}
                    data-active={mode === 'map' || undefined}
                    onClick={() => setMode('map')}
                >
                    <MapIcon className={styles.optionIcon} />
                    Карта
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'list'}
                    className={styles.modeBtn}
                    data-active={mode === 'list' || undefined}
                    onClick={() => setMode('list')}
                >
                    <Search className={styles.optionIcon} />
                    Список
                    {points.length > 0 && <span className={styles.modeCount}>{points.length}</span>}
                </button>
            </div>

            {error && (
                <div className={styles.error} role="alert">
                    {error}
                    <button
                        type="button"
                        className={styles.retryBtn}
                        onClick={() => setReloadKey((k) => k + 1)}
                        disabled={loading}
                    >
                        Повторить
                    </button>
                </div>
            )}

            {mode === 'map' ? (
                <YandexPvzMap
                    pvzList={briefs}
                    selectedCity={mapCity}
                    onSelect={handleMapSelect}
                    loading={loading || !center}
                    palette={OZON_PVZ_PALETTE}
                />
            ) : (
                <>
                    <input
                        className={styles.searchInput}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Улица, торговый центр, метро…"
                    />
                    <div className={styles.list}>
                        {loading && (
                            <div className={styles.status}>
                                <Loader2 className={styles.spin} />
                                Загружаем пункты Ozon…
                            </div>
                        )}
                        {!loading && !error && filteredPoints.length === 0 && (
                            <div className={styles.status}>
                                {points.length === 0
                                    ? 'В этом городе нет пунктов выдачи Ozon'
                                    : 'Ничего не найдено'}
                            </div>
                        )}
                        {!loading &&
                            filteredPoints.map((p) => {
                                const badge = typeLabel(p.type);
                                const active = selectedId === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className={styles.point}
                                        data-active={active || undefined}
                                        onClick={() => onChoose(p)}
                                    >
                                        <span className={styles.pointIcon}>
                                            <MapPin />
                                        </span>
                                        <span className={styles.pointBody}>
                                            <span className={styles.pointTitle}>
                                                {p.address || p.name}
                                                {badge && <span className={styles.badge}>{badge}</span>}
                                            </span>
                                            {p.address && p.name !== p.address && (
                                                <span className={styles.pointSub}>{p.name}</span>
                                            )}
                                            {p.workingHours && (
                                                <span className={styles.pointHours}>
                                                    <Clock />
                                                    {p.workingHours}
                                                </span>
                                            )}
                                        </span>
                                        {active && <span className={styles.pointCheck}>Выбран</span>}
                                    </button>
                                );
                            })}
                    </div>
                </>
            )}
        </div>
    );
};

export default OzonPvzList;
