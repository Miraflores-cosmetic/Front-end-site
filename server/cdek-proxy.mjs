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

      // Преобразуем формат ответа СДЭК в нужный формат
      if (data.items) {
        const offices = data.items.map((item) => ({
          code: item.code,
          name: item.name,
          address: item.location?.address || item.address_full || '',
          city: item.location?.city || '',
          city_code: item.location?.city_code || 0,
          postal_code: item.location?.postal_code,
          work_time: item.work_time,
          phone: item.phones?.[0]?.number || '',
          location: item.location ? {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
            address: item.location.address_full || item.location.address,
          } : undefined,
        }));
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
});
