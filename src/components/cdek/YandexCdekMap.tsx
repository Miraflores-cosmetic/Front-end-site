import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, MapPin } from 'lucide-react';

declare global {
  interface Window {
    ymaps: any;
  }
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

interface YandexCdekMapProps {
  pvzList: Pvz[];
  selectedCity: {
    city: string;
    latitude?: number;
    longitude?: number;
  } | null;
  onSelect: (pvz: Pvz) => void;
  loading?: boolean;
}

// В Vite переменные с префиксом VITE_ доступны автоматически
// Попробуем оба варианта для совместимости
const YANDEX_MAP_API_KEY = 
  import.meta.env.VITE_PUBLIC_YANDEX_MAP_API_KEY || 
  import.meta.env.PUBLIC_YANDEX_MAP_API_KEY || 
  '';

const YandexCdekMap: React.FC<YandexCdekMapProps> = ({
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
  const [selectedPvz, setSelectedPvz] = useState<Pvz | null>(null);

  // Загрузка API Яндекс Карт
  useEffect(() => {
    const loadYandexMaps = async () => {
      if (!YANDEX_MAP_API_KEY) {
        const errorMsg = 'Не указан API ключ Яндекс Карт. Проверьте переменную PUBLIC_YANDEX_MAP_API_KEY в .env';
        setError(errorMsg);
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
          script.onerror = () =>
            reject(new Error('Не удалось загрузить Яндекс Карты'));
          if (!existingScript) {
            document.head.appendChild(script);
          }
        });

        await new Promise<void>((resolve) => {
          window.ymaps.ready(() => resolve());
        });

        setMapLoading(false);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки карты');
        setMapLoading(false);
      }
    };

    loadYandexMaps();
  }, []);

  // Инициализация карты
  useEffect(() => {
    if (mapLoading || !window.ymaps || !containerRef.current) return;

    const initMap = () => {
      setMapReady(false);
      
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }

      const center = selectedCity?.latitude && selectedCity?.longitude
        ? [selectedCity.latitude, selectedCity.longitude]
        : [55.751574, 37.573856]; // Москва по умолчанию

      mapRef.current = new window.ymaps.Map(containerRef.current, {
        center,
        zoom: 12,
        controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
      }, {
        suppressMapOpenBlock: true,
      });

      clustererRef.current = new window.ymaps.Clusterer({
        preset: 'islands#greenClusterIcons',
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

  // Обновление меток при изменении списка ПВЗ
  useEffect(() => {
    if (!mapReady || !mapRef.current || !clustererRef.current) {
      return;
    }

    clustererRef.current.removeAll();

    const pvzWithCoords = pvzList.filter(
      pvz => pvz.location?.latitude && pvz.location?.longitude
    );

    if (pvzWithCoords.length === 0) {
      return;
    }

    const placemarks = pvzWithCoords.map(pvz => {
      const placemark = new window.ymaps.Placemark(
        [pvz.location!.latitude, pvz.location!.longitude],
        {
          balloonContentHeader: `<strong>${pvz.name || 'ПВЗ СДЭК'}</strong>`,
          balloonContentBody: `
            <div style="padding: 8px 0;">
              <div style="color: #666; margin-bottom: 8px;">
                📍 ${pvz.address || pvz.location?.address || 'Адрес не указан'}
              </div>
              ${pvz.work_time ? `<div style="color: #888; font-size: 12px; margin-bottom: 4px;">🕐 ${pvz.work_time}</div>` : ''}
              ${pvz.phone ? `<div style="color: #888; font-size: 12px;">📞 ${pvz.phone}</div>` : ''}
            </div>
          `,
          balloonContentFooter: `
            <button 
              onclick="window.selectCdekPvz && window.selectCdekPvz('${pvz.code}')"
              style="
                background: #16a34a; 
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
          hintContent: pvz.name || 'ПВЗ СДЭК',
        },
        {
          preset: 'islands#greenDotIcon',
          iconColor: '#16a34a',
        }
      );

      placemark.events.add('click', () => {
        setSelectedPvz(pvz);
      });

      return placemark;
    });

    clustererRef.current.add(placemarks);

    if (placemarks.length > 0) {
      mapRef.current.setBounds(clustererRef.current.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 50,
      }).catch(() => {});
    }
  }, [pvzList, mapReady]);

  // Обработчик выбора ПВЗ из баллуна
  useEffect(() => {
    (window as any).selectCdekPvz = (code: string) => {
      const pvz = pvzList.find(p => p.code === code);
      if (pvz) {
        setSelectedPvz(pvz);
        onSelect(pvz);
        if (mapRef.current) {
          mapRef.current.balloon.close();
        }
      }
    };

    return () => {
      delete (window as any).selectCdekPvz;
    };
  }, [pvzList, onSelect]);

  const handleSelect = useCallback(() => {
    if (selectedPvz) {
      onSelect(selectedPvz);
    }
  }, [selectedPvz, onSelect]);

  if (error) {
    return (
      <div style={{ border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: '12px', padding: '16px' }}>
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
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#16a34a' }} />
              <span style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)' }}>
                {mapLoading ? 'Загрузка Яндекс Карт...' : 'Загрузка пунктов выдачи...'}
              </span>
            </div>
          </div>
        )}

        {!mapLoading && !loading && pvzList.filter(p => p.location?.latitude).length === 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <MapPin style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: 'rgba(0,0,0,0.3)' }} />
              <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)' }}>
                Нет пунктов выдачи с координатами
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)', marginTop: '4px' }}>
                Попробуйте выбрать другой город или использовать список
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedPvz && (
        <div style={{
          border: '1px solid #86efac',
          background: '#f0fdf4',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <div style={{ padding: '8px', background: '#dcfce7', borderRadius: '8px', flexShrink: 0 }}>
              <MapPin style={{ width: '20px', height: '20px', color: '#16a34a' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#166534' }}>
                {selectedPvz.name || 'ПВЗ СДЭК'}
              </div>
              <div style={{ fontSize: '14px', color: '#15803d', marginTop: '4px' }}>
                {selectedPvz.address || selectedPvz.location?.address}
              </div>
              {selectedPvz.work_time && (
                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                  Режим работы: {selectedPvz.work_time}
                </div>
              )}
              {selectedPvz.phone && (
                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                  Телефон: {selectedPvz.phone}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelect}
            style={{
              width: '100%',
              marginTop: '12px',
              height: '40px',
              background: '#16a34a',
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

export default YandexCdekMap;
