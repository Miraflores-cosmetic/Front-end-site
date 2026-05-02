// Простой прокси-сервер для API СДЭК (ES Modules)
// Запуск: node server/cdek-proxy.mjs
// Или добавьте в package.json: "cdek-proxy": "node server/cdek-proxy.mjs"

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { processYandexDeliveryRequest } from './yandex-delivery-bundle.mjs';

/**
 * Корень Front (рядом с package.json) — надёжнее, чем process.cwd().
 * override: true — иначе пустая переменная из shell/родителя перекрывает значение из .env.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontRoot = path.resolve(__dirname, '..');

function loadFrontEnv() {
  const paths = [
    path.join(frontRoot, '.env'),
    path.join(frontRoot, '.env.local'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
    }
  }
  const cwd = process.cwd();
  if (cwd !== frontRoot) {
    for (const p of [path.join(cwd, '.env'), path.join(cwd, '.env.local')]) {
      if (fs.existsSync(p)) dotenv.config({ path: p, override: true });
    }
    const nested = path.join(cwd, 'Front', '.env');
    if (fs.existsSync(nested)) dotenv.config({ path: nested, override: true });
    const nestedLocal = path.join(cwd, 'Front', '.env.local');
    if (fs.existsSync(nestedLocal)) dotenv.config({ path: nestedLocal, override: true });
  }
}

loadFrontEnv();

const yandexTokenPresent = Boolean(
  (process.env.YANDEX_DELIVERY_TOKEN || process.env.YANDEX_PLATFORM_TOKEN || '').trim(),
);
console.log(
  `[CDEK Proxy] env frontRoot=${frontRoot} cwd=${process.cwd()} | Yandex token (YANDEX_DELIVERY_TOKEN или YANDEX_PLATFORM_TOKEN): ${yandexTokenPresent ? 'OK' : 'MISSING (проверьте .env и override в shell)'}`,
);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[CDEK Proxy] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});


const CDEK_API_URL = 'https://api.cdek.ru/v2';
const CDEK_ACCOUNT = process.env.CDEK_ACCOUNT;
const CDEK_SECURE = process.env.CDEK_SECURE;

let cachedToken = null;
let tokenExpiry = 0;

async function getCdekToken() {
  if (!CDEK_ACCOUNT || !CDEK_SECURE) {
    console.error('[CDEK Proxy] ❌ Credentials not set! Check CDEK_ACCOUNT and CDEK_SECURE in .env');
    return null;
  }

  if (cachedToken && Date.now() < tokenExpiry - 300000) {
    console.log('[CDEK Proxy] ✅ Using cached token');
    return cachedToken;
  }

  console.log('[CDEK Proxy] 🔑 Requesting new token from CDEK API...');
  try {
    const response = await fetch(`${CDEK_API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CDEK_ACCOUNT,
        client_secret: CDEK_SECURE,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CDEK Proxy] ❌ Token error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    if (!data.access_token) {
      console.error('[CDEK Proxy] ❌ Token response missing access_token:', data);
      return null;
    }

    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    console.log('[CDEK Proxy] ✅ Token obtained successfully, expires in', data.expires_in, 'seconds');

    return cachedToken;
  } catch (error) {
    console.error('[CDEK Proxy] ❌ Error getting token:', error.message);
    return null;
  }
}

app.get('/api/cdek/service', async (req, res) => {
  const startTime = Date.now();
  const { method, action, ...params } = req.query;

  console.log(`[CDEK Proxy] ${new Date().toISOString()} - Request: ${method || action}`, { params });

  try {
    if (method === 'location/cities') {
      console.log('[CDEK Proxy] Getting token for cities request...');
      const token = await getCdekToken();
      if (!token) {
        console.error('[CDEK Proxy] ❌ Failed to get token for cities request');
        return res.status(500).json({ error: 'Failed to authenticate with CDEK. Check CDEK_ACCOUNT and CDEK_SECURE in .env' });
      }

      console.log('[CDEK Proxy] ✅ Token obtained, fetching cities...');
      const url = `${CDEK_API_URL}/location/cities?${new URLSearchParams(params)}`;
      console.log('[CDEK Proxy] Request URL:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('[CDEK Proxy] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CDEK Proxy] ❌ Cities API error:', response.status, errorText);
        return res.status(response.status).json({ error: `CDEK API error: ${response.status}`, details: errorText });
      }

      const data = await response.json();
      const result = Array.isArray(data) ? data : (data.items || []);
      console.log(`[CDEK Proxy] ✅ Cities fetched: ${result.length} cities in ${Date.now() - startTime}ms`);
      return res.json(result);
    }

    if (action === 'offices') {
      console.log('[CDEK Proxy] Getting token for offices request...');
      const token = await getCdekToken();
      if (!token) {
        console.error('[CDEK Proxy] ❌ Failed to get token for offices request');
        return res.status(500).json({ error: 'Failed to authenticate with CDEK. Check CDEK_ACCOUNT and CDEK_SECURE in .env' });
      }

      let url = `${CDEK_API_URL}/deliverypoints`;
      const queryParams = new URLSearchParams();

      if (params.city_code) queryParams.append('city_code', params.city_code);
      if (params.city_uuid) queryParams.append('city_uuid', params.city_uuid);
      if (params.latitude) queryParams.append('latitude', params.latitude);
      if (params.longitude) queryParams.append('longitude', params.longitude);
      if (params.radius) queryParams.append('radius', params.radius);
      if (params.size) queryParams.append('size', params.size);
      if (params.type) queryParams.append('type', params.type);
      if (params.is_handout) queryParams.append('is_handout', params.is_handout);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      console.log('[CDEK Proxy] ✅ Token obtained, fetching offices...');
      console.log('[CDEK Proxy] Request URL:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('[CDEK Proxy] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CDEK Proxy] ❌ Offices API error:', response.status, errorText);
        return res.status(response.status).json({ error: `CDEK API error: ${response.status}`, details: errorText });
      }

      const data = await response.json();

      const postalFromCdekItem = (item) => {
        const loc = item.location || {};
        const pc = loc.postal_code ?? item.postal_code;
        if (pc != null && String(pc).trim() !== '') return String(pc).trim();
        const codes = loc.postal_codes;
        if (Array.isArray(codes) && codes.length > 0 && codes[0] != null) {
          return String(codes[0]).trim();
        }
        const full = loc.address_full || loc.address || item.address_full || '';
        const m = String(full).trim().match(/^(\d{6})(?:[\s,]|$)/);
        return m ? m[1] : undefined;
      };

      // Преобразуем формат ответа СДЭК в нужный формат
      if (data.items) {
        const offices = data.items.map((item) => {
          const loc = item.location || {};
          const addressLine = loc.address || item.address_full || '';
          const addressFull = loc.address_full || addressLine;
          return {
            code: item.code,
            name: item.name,
            address: addressLine || addressFull,
            city: loc.city || '',
            city_code: loc.city_code || 0,
            postal_code: postalFromCdekItem(item),
            work_time: item.work_time,
            phone: item.phones?.[0]?.number || '',
            location: item.location
              ? {
                  latitude: item.location.latitude,
                  longitude: item.location.longitude,
                  address: addressFull || addressLine,
                }
              : undefined,
          };
        });
        console.log(`[CDEK Proxy] ✅ Offices fetched: ${offices.length} offices in ${Date.now() - startTime}ms`);
        return res.json(offices);
      }

      const result = Array.isArray(data) ? data : [];
      console.log(`[CDEK Proxy] ✅ Offices fetched: ${result.length} offices in ${Date.now() - startTime}ms`);
      return res.json(result);
    }

    console.error(`[CDEK Proxy] ❌ Invalid method or action: method=${method}, action=${action}`);
    return res.status(400).json({ error: 'Invalid method or action' });
  } catch (error) {
    console.error('[CDEK Proxy] ❌ Error:', error.message);
    console.error('[CDEK Proxy] Stack:', error.stack);
    return res.status(500).json({ error: error.message });
  }
});

// —— Яндекс Доставка — env как в рабочем проекте + текущие имена
const YANDEX_PLATFORM_BASE = (
  process.env.YANDEX_DELIVERY_PLATFORM_URL ||
  process.env.YANDEX_PLATFORM_API_BASE ||
  'https://b2b-authproxy.taxi.yandex.net'
).trim();
const YANDEX_BEARER = (
  process.env.YANDEX_DELIVERY_TOKEN ||
  process.env.YANDEX_PLATFORM_TOKEN ||
  ''
).trim();
const YANDEX_PLATFORM_SOURCE_STATION_ID = (process.env.YANDEX_PLATFORM_SOURCE_STATION_ID || '').trim();
/** Platform warehouses/list: YANDEX_DELIVERY_MERCHANT_ID или YANDEX_PLATFORM_MERCHANT_ID */
const YANDEX_MERCHANT_ID = (
  process.env.YANDEX_DELIVERY_MERCHANT_ID ||
  process.env.YANDEX_PLATFORM_MERCHANT_ID ||
  ''
).trim();
const YANDEX_CARGO_BASE = (
  process.env.YANDEX_CARGO_API_BASE ||
  process.env.YANDEX_API_BASE ||
  'https://b2b.taxi.yandex.net'
).trim();

function yandexAuthHeaders(tok) {
  return {
    Authorization: `Bearer ${tok}`,
    'Content-Type': 'application/json',
    'Accept-Language': 'ru',
  };
}

const HYPH_PLATFORM_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[089ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/**
 * pricing-calculator ожидает platform_station_id «как в платформе»; в pickup-points/id часто 32 hex,
 * в кабинете — с дефисами. Отправляем несколько допустимых представлений (первый успешный).
 */
function platformStationIdVariants(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  if (!s) return [];
  const out = [];
  const add = (v) => {
    if (v == null || v === '') return;
    if (!out.includes(v)) out.push(v);
  };

  const compact = s.replace(/-/g, '');
  const lowerCompact = compact.toLowerCase();
  add(s);

  if (/^[0-9a-fA-F]{32}$/i.test(compact)) {
    add(lowerCompact);
    add(
      `${lowerCompact.slice(0, 8)}-${lowerCompact.slice(8, 12)}-${lowerCompact.slice(12, 16)}-${lowerCompact.slice(16, 20)}-${lowerCompact.slice(20)}`,
    );
  }

  return out;
}

/** Не путать: Platform station_id отправителя vs Cargo point_id склада — см. warehouses-debug */
function yandexPlatformVsCargoIdReminder() {
  return (
    ' Важно: YANDEX_PLATFORM_SOURCE_STATION_ID = station_id из Platform (POST …/platform/warehouses/list). ' +
    'YANDEX_DELIVERY_WAREHOUSE_ID = point_id в сети Яндекса для Cargo, не подставляйте вместо SOURCE_STATION_ID — будет 404. ' +
    'Токен и station_id — одного кабинета; prod-хост Platform = YANDEX_DELIVERY_PLATFORM_URL (по умол. b2b-authproxy). ' +
    'Отладка: POST /api/yandex/warehouses-debug { "merchant_id"?: "..." }.'
  );
}

function pricingYandexStationHint(message) {
  const m = String(message || '').toLowerCase();
  if (!m.includes('station')) return '';
  return (
    'Проверьте: склад и ПВЗ в том же окружении API, что и токен (prod: b2b-authproxy); склад (source) должен быть ' +
    'закреплён за вашим аккаунтом Platform для этого же Bearer-токена; id ПВЗ — см. мету/cid. ' +
    'Если склад отличный от ПВЗ — спросите в поддержке Яндекс Доставки platform_station_id отправителя.' +
    yandexPlatformVsCargoIdReminder()
  );
}

function parseCoordYandex(v) {
  if (v == null || v === '') return NaN;
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim().replace(',', '.'));
  return n;
}

function readCargoWarehousePointFromEnv() {
  const fullname =
    (
      process.env.YANDEX_DELIVERY_WAREHOUSE_FULLNAME ||
      process.env.YANDEX_DELIVERY_WAREHOUSE_WAREHOUSE_FULLNAME ||
      ''
    ).trim() || '';
  const pid = (process.env.YANDEX_DELIVERY_WAREHOUSE_ID || '').trim();
  const lat = parseCoordYandex(process.env.YANDEX_DELIVERY_WAREHOUSE_LAT);
  const lng = parseCoordYandex(process.env.YANDEX_DELIVERY_WAREHOUSE_LNG);
  const fnOk = Boolean(fullname);
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    fnOk
  ) {
    const fullNorm = normalizeRuAddressLineForPricing(fullname) || fullname;
    if (pid) {
      return { coordinates: /** @type {[number, number]} */ ([lng, lat]), fullname: fullNorm, point_id: pid };
    }
    return {
      coordinates: /** @type {[number, number]} */ ([lng, lat]),
      fullname: fullNorm,
    };
  }
  return null;
}

function isLikelyYandexPlatformStationId(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return false;
  if (HYPH_PLATFORM_UUID.test(s)) return true;
  const c = s.replace(/-/g, '');
  return /^[0-9a-fA-F]{24,32}$/i.test(c);
}

/** Нормализованный адрес «Россия, …» для pricing-calculator destination.address */
function normalizeRuAddressLineForPricing(pvzPiece) {
  const t = String(pvzPiece || '').trim().replace(/^,\s*|,\s*$/g, '');
  if (!t) return '';
  if (/^россия[,\s]/i.test(t)) return t;
  return `Россия, ${t}`;
}

function pricingDestinationsForSelfPickup(pointIdPrimary, pvzAddressPieces) {
  const ru = normalizeRuAddressLineForPricing(pvzAddressPieces);
  /** @type {Array<{ platform_station_id: string } | { address: string }>} */
  const out = [];
  if (pointIdPrimary && isLikelyYandexPlatformStationId(pointIdPrimary)) {
    for (const v of platformStationIdVariants(pointIdPrimary)) {
      out.push({ platform_station_id: v });
    }
  }
  if (ru) out.push({ address: ru });
  return out;
}

function warehousePickupFromRetrieveJson(data) {
  const wh = data && typeof data === 'object' ? data.warehouse : null;
  if (!wh || typeof wh !== 'object') return null;
  const lat = wh.coordinates?.latitude ?? wh.location?.coordinates?.latitude;
  const lon = wh.coordinates?.longitude ?? wh.location?.coordinates?.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  const a = wh.location?.address;
  let fullname = '';
  if (a && typeof a === 'object') {
    fullname = [a.city, a.street, a.house].filter(Boolean).join(', ');
  }
  if (!fullname) fullname = typeof wh.name === 'string' ? wh.name : 'Склад';
  return { lat, lon, fullname };
}

function placesToCargoItem(places) {
  const p = Array.isArray(places) && places[0] ? places[0] : {};
  const pd = p.physical_dims || {};
  const dx = Number(pd.dx) || 20;
  const dy = Number(pd.dy) || 10;
  const dz = Number(pd.dz) || 15;
  const wg = Number(pd.weight_gross) || 300;
  return {
    pickup_point: 1,
    dropoff_point: 2,
    quantity: 1,
    size: {
      length: Math.max(0.01, dx / 100),
      width: Math.max(0.01, dz / 100),
      height: Math.max(0.01, dy / 100),
    },
    weight: Math.max(0.01, wg / 1000),
  };
}

/** Минимальная цена из тела Cargo offers/calculate (разные версии контрактов). */
function minPriceFromCargoOffersCalculateBody(data) {
  if (!data || typeof data !== 'object') return null;
  const objs = [];
  if (Array.isArray(data.offers)) objs.push(...data.offers);
  if (Array.isArray(data.calculated_offers)) objs.push(...data.calculated_offers);
  if (data.offer && typeof data.offer === 'object') objs.push(data.offer);

  let min = Infinity;
  for (const o of objs) {
    const p = o?.price && typeof o.price === 'object' ? o.price : null;
    if (!p) continue;
    const tp =
      p.total_price ??
      p.total_amount_with_vat ??
      p.final_price ??
      p.offer_price ??
      p.total_payment_with_coupon;
    const num = typeof tp === 'string' ? parseFloat(tp) : typeof tp === 'number' ? tp : NaN;
    if (Number.isFinite(num) && num < min) min = num;
  }
  return min === Infinity ? null : min;
}

function warehouseCoordinatesFullnameForCargo(whJson) {
  const p = warehousePickupFromRetrieveJson(whJson);
  if (!p) return null;
  const wh = whJson?.warehouse;
  const a = wh?.location?.address;
  let fullname = '';
  if (a && typeof a === 'object') {
    const parts = [a.country, a.region, a.city, a.street, a.house].filter(Boolean);
    fullname = parts.join(', ');
  }
  if (!fullname) fullname = p.fullname;
  fullname = normalizeRuAddressLineForPricing(fullname) || fullname;
  return {
    coordinates: /** @type {[number, number]} */ ([p.lon, p.lat]),
    fullname,
  };
}

/** Одна запись склада из warehouses/list (тот же объект, что внутри retrieve). */
function pickWarehouseFromListResponse(warehouses, preferredStationRaw) {
  if (!Array.isArray(warehouses) || warehouses.length === 0) return null;
  const variants = preferredStationRaw ? platformStationIdVariants(preferredStationRaw) : [];
  if (variants.length > 0) {
    for (const v of variants) {
      const cmp = v.replace(/-/g, '').toLowerCase();
      const found = warehouses.find((w) => {
        const sid = String(w?.station_id ?? '').replace(/-/g, '').toLowerCase();
        return sid && sid === cmp;
      });
      if (found) return found;
    }
  }
  return warehouses[0];
}

function sanitizeWarehouseForDebug(w) {
  if (!w || typeof w !== 'object') return null;
  const lat = w.coordinates?.latitude ?? w.location?.coordinates?.latitude;
  const lon = w.coordinates?.longitude ?? w.location?.coordinates?.longitude;
  return {
    station_id: w.station_id,
    name: w.name,
    merchant_id: w.merchant_id,
    client_warehouse_id: w.client_warehouse_id,
    coordinates_lon_lat:
      typeof lat === 'number' && typeof lon === 'number' ? [lon, lat] : null,
  };
}

function cargoPickupPointFromWarehouseRecord(wh) {
  if (!wh || typeof wh !== 'object') return null;
  const base = warehouseCoordinatesFullnameForCargo({ warehouse: wh });
  if (!base) return null;
  const pid =
    (typeof wh.point_id === 'string' && wh.point_id.trim()) ||
    (typeof wh.cargo_point_id === 'string' && wh.cargo_point_id.trim()) ||
    '';
  if (pid) {
    return { ...base, point_id: pid };
  }
  const envPid = (process.env.YANDEX_DELIVERY_WAREHOUSE_ID || '').trim();
  if (envPid) {
    return { ...base, point_id: envPid };
  }
  return base;
}

/** Если retrieve по station_id даёт 404 — пробуем warehouses/list. */
async function cargoPickupFromWarehousesList(token) {
  if (!YANDEX_MERCHANT_ID) return null;

  const listUrl = `${YANDEX_PLATFORM_BASE}/api/b2b/platform/warehouses/list`;
  try {
    const r = await fetch(listUrl, {
      method: 'POST',
      headers: yandexAuthHeaders(token),
      body: JSON.stringify({ filter: { merchant_id: YANDEX_MERCHANT_ID } }),
    });
    const text = await r.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!r.ok) {
      console.warn('[Yandex Proxy] warehouses/list:', r.status, text.slice(0, 280));
      return null;
    }
    const warehouses = data.warehouses;
    if (!Array.isArray(warehouses) || warehouses.length === 0) {
      console.warn('[Yandex Proxy] warehouses/list: пустой список');
      return null;
    }
    const wh = pickWarehouseFromListResponse(warehouses, YANDEX_PLATFORM_SOURCE_STATION_ID);
    const pickup = cargoPickupPointFromWarehouseRecord(wh);
    if (pickup) {
      console.log('[Yandex Proxy] Cargo: точка отправления из warehouses/list');
    }
    return pickup;
  } catch (e) {
    console.warn('[Yandex Proxy] warehouses/list exception:', e.message);
    return null;
  }
}

/**
 * Cargo ПВЗ (fallback): как в рабочем проекте — NDD + point ПВЗ, склад из env или warehouses/retrieve.
 */
async function tryYandexCargoPvzNdOffer(
  token,
  sourceVariants,
  places,
  pvzLon,
  pvzLat,
  dropRawAddress,
  cargoDropPointId,
) {
  const cargoUrl = `${YANDEX_CARGO_BASE}/b2b/cargo/integration/v2/offers/calculate`;
  const whUrl = `${YANDEX_PLATFORM_BASE}/api/b2b/platform/warehouses/retrieve`;
  const item = placesToCargoItem(places);

  /** @type {{ coordinates: [number, number]; fullname: string; point_id?: string } | null} */
  let pickup = readCargoWarehousePointFromEnv();

  /** @type {string} */
    let lastWhErr = '';
    if (!pickup) {
      for (const srcId of sourceVariants) {
        let whJson = {};
        let whText = '';
        try {
          const whRes = await fetch(whUrl, {
            method: 'POST',
            headers: yandexAuthHeaders(token),
            body: JSON.stringify({ station_id: srcId }),
          });
          whText = await whRes.text();
          try {
            whJson = whText ? JSON.parse(whText) : {};
          } catch {
            whJson = {};
          }
          if (!whRes.ok) {
            lastWhErr = `${whRes.status}: ${whText.slice(0, 220)}`;
            continue;
          }
          const cand = warehouseCoordinatesFullnameForCargo(whJson);
          if (cand) {
            pickup = cand;
            break;
          }
          lastWhErr = 'warehouses/retrieve 200 без координат';
        } catch {
          lastWhErr = 'сеть при warehouses/retrieve';
        }
      }
    if (!pickup) {
      pickup = await cargoPickupFromWarehousesList(token);
    }
    if (!pickup) {
      const isRetrieve404 =
        /404/.test(lastWhErr) && /not_found|station not found/i.test(lastWhErr);
      let detail = lastWhErr ? `«${lastWhErr.slice(0, 400)}»` : 'warehouses/retrieve не дал склад';
      if (isRetrieve404) {
        detail =
          'warehouses/retrieve → 404 station not found для YANDEX_PLATFORM_SOURCE_STATION_ID: Platform не знает такой склад по этому методу (или id не тот).';
      }
      const hint = `${detail} Cargo: скопируйте YANDEX_DELIVERY_WAREHOUSE_* из рабочего проекта или задайте merchant_id (${YANDEX_MERCHANT_ID ? 'в .env уже есть' : 'YANDEX_DELIVERY_MERCHANT_ID / YANDEX_PLATFORM_MERCHANT_ID'}) для warehouses/list. ` +
        `Не путайте переменные: SOURCE_STATION_ID = только station_id из Platform (см. POST /api/yandex/warehouses-debug), ` +
        `а YANDEX_DELIVERY_WAREHOUSE_ID — point_id для Cargo.`;
      return { ok: false, diagnostics: hint };
    }
  }

  const dropFull = normalizeRuAddressLineForPricing(dropRawAddress) || 'ПВЗ';

  const rp1 = {
    id: 1,
    fullname: pickup.fullname,
    coordinates: pickup.coordinates,
  };
  if (pickup.point_id) rp1.point_id = pickup.point_id;

  const rp2 = {
    id: 2,
    coordinates: /** @type {[number, number]} */ ([pvzLon, pvzLat]),
    fullname: dropFull,
  };
  if (cargoDropPointId && String(cargoDropPointId).trim() !== '') {
    rp2.type = 'pvz';
    rp2.point_id = String(cargoDropPointId).trim();
  }

  const payload = {
    items: [item],
    route_points: [rp1, rp2],
    requirements: {
      taxi_classes: ['ndd'],
      skip_door_to_door: true,
      ndd: true,
      delivery_type: 'ndd',
    },
  };

  let data = {};
  let text = '';
  try {
    const r = await fetch(cargoUrl, {
      method: 'POST',
      headers: yandexAuthHeaders(token),
      body: JSON.stringify(payload),
    });
    text = await r.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!r.ok) {
      const snippet = text.slice(0, 400);
      console.error('[Yandex Proxy] Cargo NDD offers/calculate:', r.status, snippet);
      return { ok: false, diagnostics: `Cargo NDD offers/calculate HTTP ${r.status}: ${snippet}` };
    }
  } catch (e) {
    console.error('[Yandex Proxy] Cargo NDD exception:', e.message);
    return { ok: false, diagnostics: `Cargo: ${e.message}` };
  }

  const min = minPriceFromCargoOffersCalculateBody(data);
  if (min != null) {
    return { ok: true, pricing_total: `${min} RUB` };
  }
  return {
    ok: false,
    diagnostics: `Cargo NDD 200 OK, цена не извлечена. Фрагмент: ${text.slice(0, 450)}`,
  };
}

/** Unified Яндекс Доставка proxy (совпадает с POST /api/yandex-delivery из Vspomni Front bundle). */
app.post('/api/yandex-delivery', async (req, res) => {
  try {
    const out = await processYandexDeliveryRequest(req.body ?? {});
    const h = out.headers || {};
    for (const [k, v] of Object.entries(h)) res.setHeader(k, v);
    res.status(out.status).json(out.body);
  } catch (e) {
    console.error('[Yandex] POST /api/yandex-delivery:', e?.message ?? e);
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/yandex/pickup-points', async (req, res) => {
  const startTime = Date.now();
  try {
    const geoId = req.body?.geo_id;
    if (!YANDEX_BEARER) {
      return res.status(500).json({
        error: 'Токен не задан — укажите YANDEX_DELIVERY_TOKEN или YANDEX_PLATFORM_TOKEN в .env',
      });
    }
    if (geoId == null || geoId === '') {
      return res.status(400).json({ error: 'geo_id is required' });
    }
    const body = {
      geo_id: Number(geoId),
      payment_method: 'already_paid',
      available_for_dropoff: true,
      type: 'pickup_point',
      operator_ids: ['market_l4g', '5post'],
    };
    const url = `${YANDEX_PLATFORM_BASE}/api/b2b/platform/pickup-points/list`;
    const response = await fetch(url, {
      method: 'POST',
      headers: yandexAuthHeaders(YANDEX_BEARER),
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      console.error('[Yandex Proxy] pickup-points error:', response.status, text);
      return res.status(response.status).json(
        typeof data === 'object' && data !== null ? data : { error: text || String(response.status) },
      );
    }
    console.log(`[Yandex Proxy] pickup-points OK in ${Date.now() - startTime}ms`);
    return res.json(data);
  } catch (error) {
    console.error('[Yandex Proxy] pickup-points exception:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/** Локальная отладка: список складов Platform для проверки YANDEX_PLATFORM_SOURCE_STATION_ID (не путать с WAREHOUSE_ID Cargo). */
app.post('/api/yandex/warehouses-debug', async (req, res) => {
  const startTime = Date.now();
  try {
    if (!YANDEX_BEARER) {
      return res.status(500).json({
        error: 'Задайте YANDEX_DELIVERY_TOKEN или YANDEX_PLATFORM_TOKEN в .env',
      });
    }
    const bodyMid = typeof req.body?.merchant_id === 'string' ? req.body.merchant_id.trim() : '';
    const merchant_id = bodyMid || YANDEX_MERCHANT_ID;
    if (!merchant_id) {
      return res.status(400).json({
        error:
          'Передайте в теле JSON { "merchant_id": "..." } или задайте YANDEX_DELIVERY_MERCHANT_ID / YANDEX_PLATFORM_MERCHANT_ID в .env',
      });
    }
    const listUrl = `${YANDEX_PLATFORM_BASE}/api/b2b/platform/warehouses/list`;
    const response = await fetch(listUrl, {
      method: 'POST',
      headers: yandexAuthHeaders(YANDEX_BEARER),
      body: JSON.stringify({ filter: { merchant_id } }),
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      console.error('[Yandex Proxy] warehouses-debug:', response.status, text.slice(0, 360));
      return res.status(response.status).json(
        typeof data === 'object' && data !== null ? data : { error: text || String(response.status) },
      );
    }
    const warehousesRaw = Array.isArray(data.warehouses) ? data.warehouses : [];
    const warehouses = warehousesRaw.map(sanitizeWarehouseForDebug).filter(Boolean);

    console.log(`[Yandex Proxy] warehouses-debug OK in ${Date.now() - startTime}ms (${warehouses.length})`);
    return res.json({
      platform_base: YANDEX_PLATFORM_BASE,
      merchant_id_requested: merchant_id,
      hint:
        'Подставьте нужный warehouse.station_id в YANDEX_PLATFORM_SOURCE_STATION_ID. Это не YANDEX_DELIVERY_WAREHOUSE_ID (Cargo point_id).' +
        yandexPlatformVsCargoIdReminder(),
      suggested_station_ids_for_env: warehouses.map((w) => w.station_id),
      warehouses,
    });
  } catch (error) {
    console.error('[Yandex Proxy] warehouses-debug exception:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/** Яндекс: GET на этот путь может открыться из браузера — подсказываем, нужен только POST из checkout */
app.get('/api/yandex/pricing', (req, res) => {
  res.status(405).set('Allow', 'POST').json({
    error:
      'Расчёт доставки: только POST из приложения. Откройте checkout и выберите адрес — GET здесь не используется.',
  });
});

/** Предварительная оценка: Platform pricing-calculator, затем Cargo NDD для ПВЗ (как в рабочем проекте) */
app.post('/api/yandex/pricing', async (req, res) => {
  const startTime = Date.now();
  try {
    if (!YANDEX_BEARER) {
      return res.status(500).json({
        error: 'Токен не задан — укажите YANDEX_DELIVERY_TOKEN или YANDEX_PLATFORM_TOKEN в .env',
      });
    }

    const sourceVariants = platformStationIdVariants(YANDEX_PLATFORM_SOURCE_STATION_ID);
    const hasPlatformWarehouse = sourceVariants.length > 0;

    const tariff = req.body?.tariff === 'time_interval' ? 'time_interval' : 'self_pickup';
    const places = Array.isArray(req.body?.places)
      ? req.body.places
      : [
          {
            physical_dims: {
              weight_gross: Number(req.body?.weight_gross) || 300,
              dx: Number(req.body?.dx) || 20,
              dy: Number(req.body?.dy) || 10,
              dz: Number(req.body?.dz) || 15,
            },
          },
        ];

    let totalWeight = 0;
    for (const p of places) {
      const w = p?.physical_dims?.weight_gross;
      if (typeof w === 'number' && w > 0) totalWeight += w;
    }

    const baseSkeleton = {
      tariff,
      total_weight: totalWeight || Number(req.body?.total_weight) || 0,
      total_assessed_price: Number(req.body?.total_assessed_price) || 0,
      client_price: Number(req.body?.client_price) || 0,
      payment_method: 'already_paid',
      places,
    };

    const url = `${YANDEX_PLATFORM_BASE}/api/b2b/platform/pricing-calculator`;

    /** @type {Array<{ platform_station_id: string } | { address: string }>} */
    let pricingDestinations = [];
    let doorAddress = null;

    /** @type {string} */
    let yandexCargoPointId = '';

    let cargoPvzDiagnostics = '';

    if (tariff === 'self_pickup') {
      const destRaw = req.body?.destination_station_id;
      if (!destRaw || typeof destRaw !== 'string') {
        return res.status(400).json({ error: 'destination_station_id required for self_pickup' });
      }
      const pvzPiece =
        typeof req.body?.pvz_address === 'string' ? req.body.pvz_address.trim() : '';
      const yandexPointTrim = [
        typeof req.body?.yandex_point_id === 'string' ? req.body.yandex_point_id : '',
        typeof req.body?.yandexPointId === 'string' ? req.body.yandexPointId : '',
      ]
        .map((x) => x.trim())
        .find((x) => x.length > 0) || '';

      const cargoPidField =
        typeof req.body?.yandex_cargo_point_id === 'string' ? req.body.yandex_cargo_point_id.trim() : '';
      yandexCargoPointId = cargoPidField || yandexPointTrim || destRaw.trim();

      const pointForHeuristic = yandexPointTrim || cargoPidField || destRaw.trim();
      pricingDestinations = pricingDestinationsForSelfPickup(pointForHeuristic, pvzPiece);
      if (pricingDestinations.length === 0) {
        return res.status(400).json({
          error: 'Не удалось построить destination для ПВЗ — передайте pvz_address «Россия, город, адрес»',
        });
      }
    } else {
      const addr = req.body?.destination_address;
      if (!addr || typeof addr !== 'string') {
        return res.status(400).json({ error: 'destination_address required for time_interval' });
      }
      doorAddress = addr.trim();
      pricingDestinations = [{ address: doorAddress }];
    }

    const platformPvzExtras =
      tariff === 'self_pickup' &&
      ((typeof req.body?.yandex_point_id === 'string' && req.body.yandex_point_id.trim()) ||
        (typeof req.body?.yandexPointId === 'string' && req.body.yandexPointId.trim()))
        ? {
            mode: 'pvz',
            yandex_point_id: String(req.body?.yandex_point_id || req.body?.yandexPointId || '').trim(),
          }
        : {};

    let lastFail = /** @type {{ status: number; data: Record<string, unknown>; text: string }} */ ({
      status: 502,
      data: {},
      text: '',
    });

    if (tariff === 'time_interval' && !hasPlatformWarehouse) {
      return res.status(500).json({
        error: 'Для курьера нужен склад Platform — укажите YANDEX_PLATFORM_SOURCE_STATION_ID в .env',
      });
    }

    if (tariff === 'time_interval' || (tariff === 'self_pickup' && hasPlatformWarehouse)) {
      for (const srcId of sourceVariants) {
        for (const destination of pricingDestinations) {
          const payload = {
            ...baseSkeleton,
            ...platformPvzExtras,
            source: { platform_station_id: srcId },
            destination,
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: yandexAuthHeaders(YANDEX_BEARER),
            body: JSON.stringify(payload),
          });
          const text = await response.text();
          let data = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = { raw: text };
          }

          if (response.ok) {
            console.log(`[Yandex Proxy] pricing OK (Platform) in ${Date.now() - startTime}ms`);
            return res.json(data);
          }

          lastFail = {
            status: response.status,
            data: typeof data === 'object' && data !== null ? data : { error: text },
            text,
          };

          const msg = JSON.stringify(lastFail.data).toLowerCase();
          if (!msg.includes('station') && !msg.includes('not found')) {
            console.error('[Yandex Proxy] pricing error:', response.status, text);
            const hintStation = pricingYandexStationHint(
              typeof data === 'object' && data && typeof data.message === 'string'
                ? data.message
                : '',
            );
            const clientBody =
              typeof data === 'object' && data !== null
                ? { ...data, ...(hintStation ? { hint: hintStation } : {}) }
                : { error: text || String(response.status), ...(hintStation ? { hint: hintStation } : {}) };
            return res.status(response.status).json(clientBody);
          }
        }
      }
    }
    /* Cargo ПВЗ — после неуспеха Platform или без platform source (только при self_pickup) */
    if (tariff === 'self_pickup') {
      const pvzLon = parseCoordYandex(req.body?.pvz_longitude);
      const pvzLat = parseCoordYandex(req.body?.pvz_latitude);
      const pvzAddr =
        typeof req.body?.pvz_address === 'string' ? req.body.pvz_address.trim() : '';

      if (
        Number.isFinite(pvzLon) &&
        Number.isFinite(pvzLat) &&
        Math.abs(pvzLat) <= 90 &&
        Math.abs(pvzLon) <= 180
      ) {
        const cargoTry = await tryYandexCargoPvzNdOffer(
          YANDEX_BEARER,
          sourceVariants,
          places,
          pvzLon,
          pvzLat,
          pvzAddr,
          yandexCargoPointId,
        );

        if (cargoTry.ok && cargoTry.pricing_total) {
          console.log(`[Yandex Proxy] pricing OK (Cargo NDD PVZ) in ${Date.now() - startTime}ms`);
          return res.json({ pricing_total: cargoTry.pricing_total });
        }
        cargoPvzDiagnostics = typeof cargoTry.diagnostics === 'string' ? cargoTry.diagnostics : '';
      } else if (!cargoPvzDiagnostics && !hasPlatformWarehouse) {
        cargoPvzDiagnostics =
          'Cargo ПВЗ: нужны координаты пункта (pvz_longitude/pvz_latitude из меты) и/или склад YANDEX_DELIVERY_WAREHOUSE_* в env.';
      }
    }
    if (lastFail.status === 502 && !lastFail.text && tariff === 'self_pickup' && !hasPlatformWarehouse) {
      let hintText = cargoPvzDiagnostics || 'Platform не вызывался (нет склада в env).';
      if (!cargoPvzDiagnostics) {
        const plon = parseCoordYandex(req.body?.pvz_longitude);
        const plat = parseCoordYandex(req.body?.pvz_latitude);
        if (!Number.isFinite(plon) || !Number.isFinite(plat)) {
          hintText += ' Нужны lon/lat ПВЗ в мете адреса.';
        }
      }
      return res.status(502).json({
        message: 'Не удалось рассчитать доставку до ПВЗ',
        hint: hintText,
      });
    }

    console.error('[Yandex Proxy] pricing error (Platform и Cargo):', lastFail.status, lastFail.text);
    let hintText = pricingYandexStationHint(
      typeof lastFail.data.message === 'string' ? lastFail.data.message : lastFail.text,
    );
    if (tariff === 'self_pickup') {
      const plon = parseCoordYandex(req.body?.pvz_longitude);
      const plat = parseCoordYandex(req.body?.pvz_latitude);
      const coordsOk =
        Number.isFinite(plon) &&
        Number.isFinite(plat) &&
        Math.abs(plat) <= 90 &&
        Math.abs(plon) <= 180;
      const cargoBit = coordsOk
        ? ' Фолбек Cargo offers/calculate (NDD для ПВЗ) уже пробовали — задайте YANDEX_DELIVERY_WAREHOUSE_* и поле cid пункта в мете (operator id).'
        : ' Для Cargo ПВЗ нужны lon/lat пункта — пересохраните адрес после выбора ПВЗ.';
      hintText = hintText ? `${hintText}${cargoBit}` : cargoBit.trim();
      if (coordsOk && cargoPvzDiagnostics.trim() !== '') {
        hintText = `${hintText} Детали: ${cargoPvzDiagnostics.slice(0, 1200)}`;
      }
    }
    const clientBody =
      typeof lastFail.data === 'object' && lastFail.data !== null
        ? {
            ...lastFail.data,
            ...(hintText ? { hint: hintText } : {}),
          }
        : { error: lastFail.text || String(lastFail.status), ...(hintText ? { hint: hintText } : {}) };
    return res.status(lastFail.status).json(clientBody);
  } catch (error) {
    console.error('[Yandex Proxy] pricing exception:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/cdek/calculator', async (req, res) => {
  const startTime = Date.now();
  try {
    const token = await getCdekToken();
    if (!token) {
      return res.status(500).json({
        error: 'Failed to authenticate with CDEK. Check CDEK_ACCOUNT and CDEK_SECURE in .env',
      });
    }

    const response = await fetch(`${CDEK_API_URL}/calculator/tarifflist`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || 'Invalid JSON from CDEK' };
    }

    if (!response.ok) {
      console.error('[CDEK Proxy] ❌ Calculator error:', response.status, text);
      return res.status(response.status).json(
        typeof data === 'object' && data !== null && !Array.isArray(data)
          ? data
          : { error: text || String(response.status) },
      );
    }

    console.log(`[CDEK Proxy] ✅ Calculator OK in ${Date.now() - startTime}ms`);
    return res.json(data);
  } catch (error) {
    console.error('[CDEK Proxy] ❌ Calculator exception:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Catch-all handler for 404
app.use((req, res) => {
  console.log(`[CDEK Proxy] 404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
});


app.listen(PORT, '0.0.0.0', () => {

  console.log(`CDEK proxy server running on http://localhost:${PORT}`);
  if (!CDEK_ACCOUNT || !CDEK_SECURE) {
    console.error('⚠️  WARNING: CDEK_ACCOUNT or CDEK_SECURE not set in .env file!');
  } else {
    console.log(`✅ CDEK credentials found (Account: ${CDEK_ACCOUNT.substring(0, 4)}...)`);
  }
  if (!YANDEX_BEARER) {
    console.error(
      '⚠️  WARNING: не задан YANDEX_DELIVERY_TOKEN / YANDEX_PLATFORM_TOKEN — Yandex pickup/pricing недоступны',
    );
  }
  if (!YANDEX_PLATFORM_SOURCE_STATION_ID) {
    console.warn(
      '⚠️  WARNING: YANDEX_PLATFORM_SOURCE_STATION_ID не задан — нужен для Platform; только Cargo ПВЗ при складе из YANDEX_DELIVERY_WAREHOUSE_*.',
    );
  }
  console.log(`Yandex Platform base: ${YANDEX_PLATFORM_BASE}`);
  console.log(`Yandex Cargo base: ${YANDEX_CARGO_BASE}`);
  const whEnvOk = Boolean(
    (process.env.YANDEX_DELIVERY_WAREHOUSE_LAT || '').trim() &&
      (process.env.YANDEX_DELIVERY_WAREHOUSE_LNG || '').trim() &&
      (
        process.env.YANDEX_DELIVERY_WAREHOUSE_FULLNAME ||
        process.env.YANDEX_DELIVERY_WAREHOUSE_WAREHOUSE_FULLNAME ||
        ''
      ).trim(),
  );
  if (!whEnvOk) {
    console.warn(
      `⚠️  Cargo ПВЗ: нет полного YANDEX_DELIVERY_WAREHOUSE_* (LAT+LNG+FULLNAME). При 404 warehouses/retrieve — env склада или merchant_id (${YANDEX_MERCHANT_ID ? 'merchant в .env есть' : 'добавьте YANDEX_*_MERCHANT_ID'}); station_id см. POST /api/yandex/warehouses-debug`,
    );
  }
});
