// Простой прокси-сервер для API СДЭК (ES Modules)
// Запуск: node server/cdek-proxy.mjs
// Или добавьте в package.json: "cdek-proxy": "node server/cdek-proxy.mjs"

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

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

// —— Яндекс Доставка (Platform API) — см. YANDEX_PLATFORM_TOKEN, YANDEX_PLATFORM_SOURCE_STATION_ID
const YANDEX_PLATFORM_BASE = 'https://b2b-authproxy.taxi.yandex.net';
const YANDEX_PLATFORM_TOKEN = process.env.YANDEX_PLATFORM_TOKEN;
const YANDEX_PLATFORM_SOURCE_STATION_ID = process.env.YANDEX_PLATFORM_SOURCE_STATION_ID;

app.post('/api/yandex/pickup-points', async (req, res) => {
  const startTime = Date.now();
  try {
    const geoId = req.body?.geo_id;
    if (!YANDEX_PLATFORM_TOKEN) {
      return res.status(500).json({ error: 'YANDEX_PLATFORM_TOKEN is not set in .env' });
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
      headers: {
        Authorization: `Bearer ${YANDEX_PLATFORM_TOKEN}`,
        'Content-Type': 'application/json',
      },
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

/** Яндекс: GET на этот путь может открыться из браузера — подсказываем, нужен только POST из checkout */
app.get('/api/yandex/pricing', (req, res) => {
  res.status(405).set('Allow', 'POST').json({
    error:
      'Расчёт доставки: только POST из приложения. Откройте checkout и выберите адрес — GET здесь не используется.',
  });
});

/** Предварительная оценка через Platform pricing-calculator */
app.post('/api/yandex/pricing', async (req, res) => {
  const startTime = Date.now();
  try {
    if (!YANDEX_PLATFORM_TOKEN) {
      return res.status(500).json({ error: 'YANDEX_PLATFORM_TOKEN is not set in .env' });
    }
    if (!YANDEX_PLATFORM_SOURCE_STATION_ID) {
      return res.status(500).json({
        error:
          'YANDEX_PLATFORM_SOURCE_STATION_ID is not set — укажите id станции отправления в .env',
      });
    }

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

    const base = {
      source: { platform_station_id: YANDEX_PLATFORM_SOURCE_STATION_ID },
      tariff,
      total_weight: totalWeight || Number(req.body?.total_weight) || 0,
      total_assessed_price: Number(req.body?.total_assessed_price) || 0,
      client_price: Number(req.body?.client_price) || 0,
      payment_method: 'already_paid',
      places,
    };

    let destination;
    if (tariff === 'self_pickup') {
      const id = req.body?.destination_station_id;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'destination_station_id required for self_pickup' });
      }
      destination = { platform_station_id: id };
    } else {
      const addr = req.body?.destination_address;
      if (!addr || typeof addr !== 'string') {
        return res.status(400).json({ error: 'destination_address required for time_interval' });
      }
      destination = { address: addr.trim() };
    }

    const payload = { ...base, destination };
    const url = `${YANDEX_PLATFORM_BASE}/api/b2b/platform/pricing-calculator`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${YANDEX_PLATFORM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      console.error('[Yandex Proxy] pricing error:', response.status, text);
      const hintText =
        typeof data === 'object' &&
        data !== null &&
        String(data.message || '').includes('Source station')
          ? 'Проверьте YANDEX_PLATFORM_SOURCE_STATION_ID: это platform_station_id склада ОТПРАВЛЕНИЯ в кабинете Яндекс Доставки (не id ПВЗ получателя).'
          : '';
      if (hintText) console.error('[Yandex Proxy] ' + hintText);
      const clientBody =
        typeof data === 'object' && data !== null
          ? {
              ...data,
              ...(hintText ? { hint: hintText } : {}),
            }
          : { error: text || String(response.status) };
      return res.status(response.status).json(clientBody);
    }
    console.log(`[Yandex Proxy] pricing OK in ${Date.now() - startTime}ms`);
    return res.json(data);
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
  if (!process.env.YANDEX_PLATFORM_TOKEN) {
    console.error('⚠️  WARNING: YANDEX_PLATFORM_TOKEN not set — Yandex pickup/pricing недоступны');
  }
  if (!process.env.YANDEX_PLATFORM_SOURCE_STATION_ID) {
    console.error('⚠️  WARNING: YANDEX_PLATFORM_SOURCE_STATION_ID not set — расчёт тарифов Яндекс не будет работать');
  }
});
