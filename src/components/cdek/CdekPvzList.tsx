import React, { useState, useEffect, useMemo, useCallback } from 'react';
import YandexCdekMap from './YandexCdekMap';
import { extractRuPostalCode } from '@/utils/extractRuPostalCode';
import { normalizeCdekPvzFromApi } from '@/utils/normalizeCdekPvz';
import styles from './CdekPvzList.module.scss';

export interface CdekPvzInfo {
  id: string;
  cityName: string;
  cityCode: string;
  address: string;
  name: string;
  workTime?: string;
  phone?: string;
  postalCode?: string;
  /** Субъект РФ из справочника городов СДЭК (для поля области) */
  region?: string;
  lat?: number;
  lon?: number;
  type: 'office' | 'pickup';
}

interface CdekPvzListProps {
  onChoose: (info: CdekPvzInfo) => void;
  defaultCity?: string;
  initialMode?: 'list' | 'map';
}

interface City {
  code: number;
  city: string;
  city_uuid: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  region_code?: number;
}

interface Pvz {
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

const POPULAR_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
];

function IconPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 4.5h3l1 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1v3a2 2 0 0 1-2 2A14.5 14.5 0 0 1 4.5 6.5a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5 9 4.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 4.5v13M15 6.5v13" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" opacity="0.25" />
      <path
        d="M20 12a8 8 0 0 0-8-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const CdekPvzList: React.FC<CdekPvzListProps> = ({
  onChoose,
  defaultCity = 'Москва',
  initialMode = 'list',
}) => {
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [pvzList, setPvzList] = useState<Pvz[]>([]);
  const [pvzLoading, setPvzLoading] = useState(false);
  const [pvzSearchQuery, setPvzSearchQuery] = useState('');
  const [showWidget, setShowWidget] = useState(initialMode === 'map');

  useEffect(() => {
    setShowWidget(initialMode === 'map');
  }, [initialMode]);

  useEffect(() => {
    const fetchCities = async () => {
      setCitiesLoading(true);
      setCitiesError(null);

      try {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/api/cdek/service?method=location/cities&size=10000&country_codes=RU`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          setCitiesError(`Ошибка загрузки городов: ${response.status}`);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const citiesList: City[] = Array.isArray(data) ? data : (data.items || []);

        if (citiesList.length === 0) {
          setCitiesError('Не удалось загрузить список городов');
          return;
        }

        const sortedCities = citiesList.sort((a, b) =>
          a.city.localeCompare(b.city, 'ru'),
        );

        setCities(sortedCities);

        const needle = defaultCity.trim().toLowerCase();
        const defaultCityData =
          sortedCities.find((c) => c.city.toLowerCase() === needle) ||
          sortedCities.find(
            (c) =>
              needle.length >= 3 &&
              (c.city.toLowerCase().includes(needle) ||
                needle.includes(c.city.toLowerCase())),
          );

        if (defaultCityData) {
          setSelectedCity(defaultCityData);
        } else if (sortedCities.length > 0) {
          const moscow = sortedCities.find((c) => c.city === 'Москва');
          const cityToSet = moscow || sortedCities[0];
          setSelectedCity(cityToSet);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Ошибка загрузки городов';
        setCitiesError(message);
      } finally {
        setCitiesLoading(false);
      }
    };

    fetchCities();
  }, [defaultCity]);

  useEffect(() => {
    if (!selectedCity) return;

    const fetchPvzList = async () => {
      setPvzLoading(true);
      setPvzList([]);

      let pvz: Pvz[] = [];

      try {
        const baseUrl = window.location.origin;
        let url = `${baseUrl}/api/cdek/service?action=offices&city_code=${selectedCity.code}&size=100`;

        if (selectedCity.city_uuid) {
          url += `&city_uuid=${selectedCity.city_uuid}`;
        }

        if (selectedCity.latitude && selectedCity.longitude) {
          url += `&latitude=${selectedCity.latitude}&longitude=${selectedCity.longitude}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const toPvzArray = (raw: unknown): Pvz[] => {
          let list: unknown[] = [];
          if (Array.isArray(raw)) list = raw;
          else if (
            raw &&
            typeof raw === 'object' &&
            Array.isArray((raw as { items?: unknown[] }).items)
          ) {
            list = (raw as { items: unknown[] }).items;
          }
          return list.map((item) => normalizeCdekPvzFromApi(item) as Pvz);
        };

        pvz = toPvzArray(data);

        if (pvz.length === 0 && selectedCity.latitude && selectedCity.longitude) {
          const proxyUrl = `${baseUrl}/api/cdek/service?action=offices&latitude=${selectedCity.latitude}&longitude=${selectedCity.longitude}&radius=50`;

          const publicResponse = await fetch(proxyUrl);

          if (publicResponse.ok) {
            const publicData = await publicResponse.json();
            if (!publicData.error) {
              pvz = toPvzArray(publicData);
            }
          }
        }

        setPvzList(pvz);
      } catch {
        setPvzList([]);
      } finally {
        setPvzLoading(false);
      }
    };

    fetchPvzList();
  }, [selectedCity]);

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) {
      const popular = cities.filter((c) =>
        POPULAR_CITIES.some((p) => c.city.toLowerCase() === p.toLowerCase()),
      );
      const others = cities.filter(
        (c) =>
          !POPULAR_CITIES.some((p) => c.city.toLowerCase() === p.toLowerCase()),
      );
      return [...popular, ...others].slice(0, 50);
    }

    const query = citySearchQuery.toLowerCase().trim();
    return cities
      .filter((c) => c.city.toLowerCase().includes(query))
      .slice(0, 50);
  }, [cities, citySearchQuery]);

  const filteredPvz = useMemo(() => {
    if (!pvzSearchQuery.trim()) return pvzList;

    const query = pvzSearchQuery.toLowerCase();
    return pvzList.filter((pvz) => {
      const name = (pvz.name || '').toLowerCase();
      const address = (pvz.address || '').toLowerCase();
      return name.includes(query) || address.includes(query);
    });
  }, [pvzList, pvzSearchQuery]);

  const handleCitySelect = useCallback((city: City) => {
    setSelectedCity(city);
    setCitySearchQuery('');
    setShowCityDropdown(false);
    setPvzSearchQuery('');
    setShowWidget(false);
  }, []);

  const resolvePvzPostal = useCallback((pvz: Pvz): string => {
    const raw =
      pvz.postal_code != null && String(pvz.postal_code).trim() !== ''
        ? String(pvz.postal_code).trim()
        : '';
    if (raw) return raw;
    const addr = pvz.address || pvz.location?.address || '';
    return extractRuPostalCode(addr);
  }, []);

  const buildPvzInfo = useCallback(
    (pvz: Pvz): CdekPvzInfo => {
      const line = pvz.address || pvz.location?.address || '';
      const lat = pvz.location?.latitude;
      const lon = pvz.location?.longitude;
      return {
        id: pvz.code,
        cityName: pvz.city || selectedCity?.city || '',
        cityCode: String(pvz.city_code || selectedCity?.code || ''),
        address: line,
        name: pvz.name || 'ПВЗ СДЭК',
        workTime: pvz.work_time,
        phone: pvz.phone,
        postalCode: resolvePvzPostal(pvz),
        region: selectedCity?.region,
        lat: typeof lat === 'number' && Number.isFinite(lat) ? lat : undefined,
        lon: typeof lon === 'number' && Number.isFinite(lon) ? lon : undefined,
        type: 'office',
      };
    },
    [selectedCity, resolvePvzPostal],
  );

  const handleMapSelect = useCallback(
    (pvz: Pvz) => {
      onChoose(buildPvzInfo(pvz));
    },
    [onChoose, buildPvzInfo],
  );

  const handlePvzSelect = useCallback(
    (pvz: Pvz) => {
      if (!pvz || !pvz.code) return;
      onChoose(buildPvzInfo(pvz));
    },
    [onChoose, buildPvzInfo],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.city-dropdown-container')) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.root}>
      <div className={`${styles.cityDropdown} city-dropdown-container`}>
        <p className={styles.label}>
          <IconPin className={styles.icon} />
          Город
        </p>

        {citiesLoading ? (
          <div className={styles.statusBox}>
            <IconSpinner className={styles.spin} />
            Загрузка городов...
          </div>
        ) : citiesError ? (
          <div className={styles.statusBoxError}>{citiesError}</div>
        ) : (
          <div className={styles.cityDropdown}>
            <button
              type="button"
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className={styles.cityTrigger}
            >
              <span
                className={`${styles.cityTriggerText} ${
                  selectedCity ? '' : styles.cityTriggerPlaceholder
                }`}
              >
                {selectedCity?.city || 'Выберите город'}
              </span>
              <IconChevron
                className={`${styles.chevron} ${showCityDropdown ? styles.chevronOpen : ''}`}
              />
            </button>

            {showCityDropdown && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownSearch}>
                  <div className={styles.searchWrap}>
                    <IconSearch className={styles.searchIcon} />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="Поиск города..."
                      className={styles.searchInput}
                      autoFocus
                    />
                  </div>
                </div>

                <div className={styles.dropdownList}>
                  {filteredCities.length === 0 ? (
                    <div className={styles.dropdownEmpty}>Город не найден</div>
                  ) : (
                    filteredCities.map((city) => (
                      <button
                        key={city.code}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className={`${styles.dropdownItem} ${
                          selectedCity?.code === city.code
                            ? styles.dropdownItemActive
                            : ''
                        }`}
                      >
                        <span>{city.city}</span>
                        {city.region ? (
                          <span className={styles.dropdownRegion}>{city.region}</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCity && (
        <>
          <div className={styles.modeToggle}>
            <button
              type="button"
              onClick={() => setShowWidget(false)}
              className={`${styles.modeBtn} ${!showWidget ? styles.modeBtnActive : ''}`}
            >
              <IconSearch className={styles.icon} />
              Список
            </button>
            <button
              type="button"
              onClick={() => setShowWidget(true)}
              className={`${styles.modeBtn} ${showWidget ? styles.modeBtnActive : ''}`}
            >
              <IconMap className={styles.icon} />
              Карта
            </button>
          </div>

          {showWidget ? (
            <YandexCdekMap
              pvzList={pvzList}
              selectedCity={selectedCity}
              onSelect={handleMapSelect}
              loading={pvzLoading}
            />
          ) : (
            <>
              <div className={styles.field}>
                <p className={styles.label}>
                  <IconSearch className={styles.icon} />
                  Поиск пункта выдачи
                </p>
                <input
                  type="text"
                  value={pvzSearchQuery}
                  onChange={(e) => setPvzSearchQuery(e.target.value)}
                  placeholder="Введите адрес или название ПВЗ"
                  className={styles.textInput}
                />
              </div>

              <div className={styles.pvzList}>
                {pvzLoading ? (
                  <div className={styles.pvzLoading}>
                    <IconSpinner className={styles.spinLg} />
                    <span>Загрузка пунктов выдачи...</span>
                  </div>
                ) : filteredPvz.length === 0 ? (
                  <div className={styles.pvzEmpty}>
                    <IconPin className={styles.iconLg} />
                    <div className={styles.pvzEmptyTitle}>Пункты выдачи не найдены</div>
                    <div className={styles.pvzEmptyHint}>
                      {pvzSearchQuery
                        ? 'Попробуйте изменить поисковый запрос'
                        : `Попробуйте открыть карту для поиска ПВЗ в ${selectedCity.city}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWidget(true)}
                      className={styles.mapCta}
                    >
                      <IconMap className={styles.icon} />
                      Открыть карту СДЭК
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.pvzCount}>
                      Найдено пунктов: {filteredPvz.length}
                    </div>
                    {filteredPvz.map((pvz) => (
                      <button
                        key={pvz.code}
                        type="button"
                        onClick={() => handlePvzSelect(pvz)}
                        className={styles.pvzCard}
                      >
                        <div className={styles.pvzName}>{pvz.name || 'ПВЗ СДЭК'}</div>
                        <div className={styles.pvzAddress}>
                          <IconPin className={styles.iconSm} />
                          {pvz.address || pvz.location?.address || 'Адрес не указан'}
                        </div>
                        <div className={styles.pvzMeta}>
                          {pvz.work_time ? (
                            <div className={styles.pvzMetaItem}>
                              <IconClock className={styles.iconXs} />
                              {pvz.work_time}
                            </div>
                          ) : null}
                          {pvz.phone ? (
                            <div className={styles.pvzMetaItem}>
                              <IconPhone className={styles.iconXs} />
                              {pvz.phone}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CdekPvzList;
