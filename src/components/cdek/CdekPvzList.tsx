import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, MapPin, Clock, Phone, ChevronDown, Loader2, Map } from 'lucide-react';
import YandexCdekMap from './YandexCdekMap';

export interface CdekPvzInfo {
  id: string;
  cityName: string;
  cityCode: string;
  address: string;
  name: string;
  workTime?: string;
  phone?: string;
  postalCode?: string;
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

  // Загрузка списка городов
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
          a.city.localeCompare(b.city, 'ru')
        );
        
        setCities(sortedCities);
        
        const defaultCityData = sortedCities.find(
          (c) => c.city.toLowerCase() === defaultCity.toLowerCase(),
        );
        
        if (defaultCityData) {
          setSelectedCity(defaultCityData);
        } else if (sortedCities.length > 0) {
          const moscow = sortedCities.find(c => c.city === 'Москва');
          const cityToSet = moscow || sortedCities[0];
          setSelectedCity(cityToSet);
        }
      } catch (error: any) {
        setCitiesError(error?.message || 'Ошибка загрузки городов');
      } finally {
        setCitiesLoading(false);
      }
    };

    fetchCities();
  }, [defaultCity]); // Запускается при монтировании и при изменении defaultCity

  // Загрузка пунктов выдачи при выборе города
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
        
        if (Array.isArray(data)) {
          pvz = data;
        }
        
        if (pvz.length === 0 && selectedCity.latitude && selectedCity.longitude) {
          const proxyUrl = `${baseUrl}/api/cdek/service?action=offices&latitude=${selectedCity.latitude}&longitude=${selectedCity.longitude}&radius=50`;
          
          const publicResponse = await fetch(proxyUrl);
          
          if (publicResponse.ok) {
            const publicData = await publicResponse.json();
            if (!publicData.error && Array.isArray(publicData)) {
              pvz = publicData;
            }
          }
        }
        
        setPvzList(pvz);
        
      } catch (error: any) {
        setPvzList([]);
      } finally {
        setPvzLoading(false);
      }
    };

    fetchPvzList();
  }, [selectedCity]);

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) {
      const popular = cities.filter(c => 
        POPULAR_CITIES.some(p => c.city.toLowerCase() === p.toLowerCase())
      );
      const others = cities.filter(c => 
        !POPULAR_CITIES.some(p => c.city.toLowerCase() === p.toLowerCase())
      );
      return [...popular, ...others].slice(0, 50);
    }
    
    const query = citySearchQuery.toLowerCase().trim();
    return cities
      .filter(c => c.city.toLowerCase().includes(query))
      .slice(0, 50);
  }, [cities, citySearchQuery]);

  const filteredPvz = useMemo(() => {
    if (!pvzSearchQuery.trim()) return pvzList;
    
    const query = pvzSearchQuery.toLowerCase();
    return pvzList.filter(pvz => {
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

  const handleMapSelect = useCallback((pvz: Pvz) => {
    const pvzInfo: CdekPvzInfo = {
      id: pvz.code,
      cityName: pvz.city || selectedCity?.city || '',
      cityCode: String(pvz.city_code || selectedCity?.code || ''),
      address: pvz.address || pvz.location?.address || '',
      name: pvz.name || 'ПВЗ СДЭК',
      workTime: pvz.work_time,
      phone: pvz.phone,
      postalCode: pvz.postal_code,
      type: 'office',
    };
    onChoose(pvzInfo);
  }, [selectedCity, onChoose]);

  const handlePvzSelect = useCallback((pvz: Pvz) => {
    if (!pvz || !pvz.code) return;

    const pvzInfo: CdekPvzInfo = {
      id: pvz.code,
      cityName: pvz.city || selectedCity?.city || '',
      cityCode: String(pvz.city_code || selectedCity?.code || ''),
      address: pvz.address || pvz.location?.address || '',
      name: pvz.name || 'ПВЗ СДЭК',
      workTime: pvz.work_time,
      phone: pvz.phone,
      postalCode: pvz.postal_code,
      type: 'office',
    };
    
    onChoose(pvzInfo);
  }, [selectedCity, onChoose]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Выбор города */}
      <div className="city-dropdown-container" style={{ position: 'relative' }}>
        <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin style={{ width: '16px', height: '16px' }} />
          Город
        </label>
        
        {citiesLoading ? (
          <div style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(0,0,0,0.5)' }}>
            <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
            Загрузка городов...
          </div>
        ) : citiesError ? (
          <div style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid #fca5a5', background: '#fef2f2', display: 'flex', alignItems: 'center', fontSize: '14px', color: '#dc2626' }}>
            {citiesError}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              style={{
                width: '100%',
                height: '48px',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: '16px',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: selectedCity ? 'black' : 'rgba(0,0,0,0.4)' }}>
                {selectedCity?.city || 'Выберите город'}
              </span>
              <ChevronDown style={{ width: '20px', height: '20px', color: 'rgba(0,0,0,0.4)', transform: showCityDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            
            {showCityDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                marginTop: '4px',
                background: 'white',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                maxHeight: '320px',
                overflow: 'hidden',
              }}>
                {/* Поиск города */}
                <div style={{ padding: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'rgba(0,0,0,0.4)' }} />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="Поиск города..."
                      style={{
                        width: '100%',
                        height: '40px',
                        paddingLeft: '36px',
                        paddingRight: '16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* Список городов */}
                <div style={{ overflowY: 'auto', maxHeight: '240px' }}>
                  {filteredCities.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(0,0,0,0.5)', fontSize: '14px' }}>
                      Город не найден
                    </div>
                  ) : (
                    filteredCities.map((city) => (
                      <button
                        key={city.code}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          background: selectedCity?.code === city.code ? 'rgba(0,0,0,0.05)' : 'transparent',
                          fontWeight: selectedCity?.code === city.code ? 500 : 'normal',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedCity?.code !== city.code) {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedCity?.code !== city.code) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <span>{city.city}</span>
                        {city.region && (
                          <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>{city.region}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Пункты выдачи */}
      {selectedCity && (
        <>
          {/* Переключатель режимов */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowWidget(false)}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: !showWidget ? '#000' : '#f3f4f6',
                color: !showWidget ? 'white' : 'rgba(0,0,0,0.6)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Search style={{ width: '16px', height: '16px' }} />
              Список
            </button>
            <button
              type="button"
              onClick={() => setShowWidget(true)}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: showWidget ? '#000' : '#f3f4f6',
                color: showWidget ? 'white' : 'rgba(0,0,0,0.6)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Map style={{ width: '16px', height: '16px' }} />
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
              {/* Поиск ПВЗ */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search style={{ width: '16px', height: '16px' }} />
                  Поиск пункта выдачи
                </label>
                <input
                  type="text"
                  value={pvzSearchQuery}
                  onChange={(e) => setPvzSearchQuery(e.target.value)}
                  placeholder="Введите адрес или название ПВЗ"
                  style={{
                    height: '48px',
                    padding: '0 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '16px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Список ПВЗ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {pvzLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '32px', color: 'rgba(0,0,0,0.6)' }}>
                    <Loader2 className="animate-spin" style={{ width: '20px', height: '20px' }} />
                    <span>Загрузка пунктов выдачи...</span>
                  </div>
                ) : filteredPvz.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(0,0,0,0.5)' }}>
                    <MapPin style={{ width: '32px', height: '32px', margin: '0 auto 12px', color: 'rgba(0,0,0,0.2)' }} />
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Пункты выдачи не найдены</div>
                    <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', marginBottom: '12px' }}>
                      {pvzSearchQuery 
                        ? 'Попробуйте изменить поисковый запрос' 
                        : `Попробуйте открыть карту для поиска ПВЗ в ${selectedCity.city}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWidget(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#16a34a',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Map style={{ width: '16px', height: '16px' }} />
                      Открыть карту СДЭК
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>
                      Найдено пунктов: {filteredPvz.length}
                    </div>
                    {filteredPvz.map((pvz) => (
                      <button
                        key={pvz.code}
                        type="button"
                        onClick={() => handlePvzSelect(pvz)}
                        style={{
                          textAlign: 'left',
                          padding: '16px',
                          border: '1px solid rgba(0,0,0,0.1)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          background: 'white',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.3)';
                          e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          {pvz.name || 'ПВЗ СДЭК'}
                        </div>
                        
                        <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', marginBottom: '8px', display: 'flex', alignItems: 'start', gap: '6px' }}>
                          <MapPin style={{ width: '14px', height: '14px', marginTop: '2px', flexShrink: 0 }} />
                          {pvz.address || pvz.location?.address || 'Адрес не указан'}
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'rgba(0,0,0,0.5)' }}>
                          {pvz.work_time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock style={{ width: '12px', height: '12px' }} />
                              {pvz.work_time}
                            </div>
                          )}
                          {pvz.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone style={{ width: '12px', height: '12px' }} />
                              {pvz.phone}
                            </div>
                          )}
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
