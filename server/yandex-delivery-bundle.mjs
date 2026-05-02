/**
 * Порт логики `src/app/api/yandex-delivery/route.ts` (Vspomni Front bundle) для Express.
 * Единое тело POST: action = calculate | list-pickup-points | warehouses-list
 */

const YANDEX_API_BASE = 'https://b2b.taxi.yandex.net';
const YANDEX_PLATFORM_API_BASE =
  process.env.YANDEX_DELIVERY_PLATFORM_URL || 'https://b2b-authproxy.taxi.yandex.net';
const CARGO_PATH = '/b2b/cargo/integration/v2';
const PLATFORM_PICKUP_LIST_PATH = '/api/b2b/platform/pickup-points/list';
const PLATFORM_PRICING_CALCULATOR_PATH = '/api/b2b/platform/pricing-calculator';
const PLATFORM_WAREHOUSES_LIST_PATH = '/api/b2b/platform/warehouses/list';

const HYPHENATED_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isHyphenatedUuidPointId(s) {
  return HYPHENATED_UUID_RE.test(String(s).trim());
}

function isLikelyYandexPlatformStationId(s) {
  const t = String(s).trim();
  if (HYPHENATED_UUID_RE.test(t)) return true;
  return /^[0-9a-f]{24,32}$/i.test(t);
}

// ——— shipment estimate (из yandexShipmentEstimate.ts) ———
const DEFAULT_UNIT_G = 200;
const DEFAULT_MM = { l: 80, w: 55, h: 45 };
const MIN_SIDE_CM = 8;
const MAX_SIDE_CM = 150;
const MIN_TOTAL_G = 100;
const MAX_TOTAL_G = 50_000;
const MAX_STACKED_EDGE_MM = 1200;
const NDD_PVZ_MAX_CM_ASC = [15, 25, 32];

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function stackedBoxMm(lengthMm, widthMm, heightMm, qty) {
  const q = Math.max(1, Math.floor(qty));
  const sorted = [lengthMm, widthMm, heightMm].sort((x, y) => x - y);
  const a = sorted[0];
  const b = sorted[1];
  const c = sorted[2];
  const stackedShort = Math.min(a * q, MAX_STACKED_EDGE_MM);
  return [stackedShort, b, c];
}

function estimateYandexShipmentPackage(lines) {
  const valid = lines.filter((l) => l.quantity > 0);
  if (valid.length === 0) {
    return { totalWeightG: 2000, dxCm: 30, dyCm: 20, dzCm: 20 };
  }

  let totalWeightG = 0;
  let totalVolMm3 = 0;

  for (const line of valid) {
    const q = Math.floor(line.quantity);
    const wKg =
      line.weightKg != null && line.weightKg > 0 ? line.weightKg : undefined;
    const g = wKg != null ? Math.round(wKg * 1000 * q) : DEFAULT_UNIT_G * q;
    totalWeightG += g;

    const l =
      line.lengthMm != null && line.lengthMm > 0 ? line.lengthMm : DEFAULT_MM.l;
    const w =
      line.widthMm != null && line.widthMm > 0 ? line.widthMm : DEFAULT_MM.w;
    const h =
      line.heightMm != null && line.heightMm > 0 ? line.heightMm : DEFAULT_MM.h;
    totalVolMm3 += l * w * h * q;
  }

  totalWeightG = clamp(totalWeightG, MIN_TOTAL_G, MAX_TOTAL_G);

  if (valid.length === 1) {
    const line = valid[0];
    const q = Math.max(1, Math.floor(line.quantity));
    const l =
      line.lengthMm != null && line.lengthMm > 0 ? line.lengthMm : DEFAULT_MM.l;
    const w =
      line.widthMm != null && line.widthMm > 0 ? line.widthMm : DEFAULT_MM.w;
    const h =
      line.heightMm != null && line.heightMm > 0 ? line.heightMm : DEFAULT_MM.h;
    const edgesMm = stackedBoxMm(l, w, h, q);
    const sorted = [...edgesMm].sort((x, y) => x - y);
    const d0 = sorted[0];
    const d1 = sorted[1];
    const d2 = sorted[2];
    const toCm = (mm) => Math.round((mm / 10) * 10) / 10;
    return {
      totalWeightG,
      dxCm: toCm(d2),
      dyCm: toCm(d1),
      dzCm: toCm(d0),
    };
  }

  const volCm3 = Math.max(1, totalVolMm3 / 1000);
  const side = Math.cbrt(volCm3);
  const base = clamp(side, MIN_SIDE_CM, MAX_SIDE_CM);
  const dxCm = clamp(base * 1.12, MIN_SIDE_CM, MAX_SIDE_CM);
  const dyCm = clamp(base * 0.98, MIN_SIDE_CM, MAX_SIDE_CM);
  const dzCm = clamp(base * 0.9, MIN_SIDE_CM, MAX_SIDE_CM);

  return {
    totalWeightG,
    dxCm: Math.round(dxCm * 10) / 10,
    dyCm: Math.round(dyCm * 10) / 10,
    dzCm: Math.round(dzCm * 10) / 10,
  };
}

function toYandexPricingCalculatorDimsCm(sideACm, sideBCm, sideCCm) {
  const [a, b, c] = [sideACm, sideBCm, sideCCm]
    .map((n) => Math.max(1, Math.round(Number(n) || 1)))
    .sort((x, y) => x - y);
  return { dy: a, dz: b, dx: c };
}

function capYandexNddPvzPackageDims(pkg) {
  const maxAsc = NDD_PVZ_MAX_CM_ASC;
  const sidesAsc = [pkg.dxCm, pkg.dyCm, pkg.dzCm].sort((x, y) => x - y);
  if (
    sidesAsc[0] <= maxAsc[0] &&
    sidesAsc[1] <= maxAsc[1] &&
    sidesAsc[2] <= maxAsc[2]
  ) {
    return pkg;
  }
  const scale = Math.min(
    maxAsc[0] / sidesAsc[0],
    maxAsc[1] / sidesAsc[1],
    maxAsc[2] / sidesAsc[2],
  );
  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    totalWeightG: pkg.totalWeightG,
    dxCm: round1(pkg.dxCm * scale),
    dyCm: round1(pkg.dyCm * scale),
    dzCm: round1(pkg.dzCm * scale),
  };
}

function resolveYandexShipmentPackage(body) {
  const s = body.shipment;
  if (
    s &&
    typeof s.total_weight_g === 'number' &&
    Number.isFinite(s.total_weight_g) &&
    s.total_weight_g > 0 &&
    typeof s.length_cm === 'number' &&
    Number.isFinite(s.length_cm) &&
    s.length_cm > 0 &&
    typeof s.width_cm === 'number' &&
    Number.isFinite(s.width_cm) &&
    s.width_cm > 0 &&
    typeof s.height_cm === 'number' &&
    Number.isFinite(s.height_cm) &&
    s.height_cm > 0
  ) {
    return {
      totalWeightG: clamp(Math.round(s.total_weight_g), MIN_TOTAL_G, MAX_TOTAL_G),
      dxCm: clamp(s.length_cm, MIN_SIDE_CM, MAX_SIDE_CM),
      dyCm: clamp(s.width_cm, MIN_SIDE_CM, MAX_SIDE_CM),
      dzCm: clamp(s.height_cm, MIN_SIDE_CM, MAX_SIDE_CM),
    };
  }

  const lines = body.shipment_lines;
  if (Array.isArray(lines) && lines.length > 0) {
    return estimateYandexShipmentPackage(
      lines.map((r) => ({
        quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)),
        weightKg: r.weight_kg,
        lengthMm: r.length_mm,
        widthMm: r.width_mm,
        heightMm: r.height_mm,
      })),
    );
  }

  return estimateYandexShipmentPackage([]);
}

// ——— route helpers ———
function normalizeRuAddressForYandex(fullname) {
  const s = String(fullname).trim();
  return s
    .replace(/^Россия,\s*Москва\s+(?!,)/i, 'Россия, Москва, ')
    .replace(/^Россия,\s*Санкт-Петербург\s+(?!,)/i, 'Россия, Санкт-Петербург, ');
}

function addressForPlatformPricing(full) {
  return String(full).replace(/^Россия,\s*/i, '').trim() || String(full).trim();
}

function parsePricingTotalRub(s) {
  if (!s || typeof s !== 'string') return NaN;
  const m = s.replace(/\s/g, '').match(/^([\d.,]+)/);
  if (!m) return NaN;
  return parseFloat(m[1].replace(',', '.'));
}

function getToken() {
  const token = (
    process.env.YANDEX_DELIVERY_TOKEN || process.env.YANDEX_PLATFORM_TOKEN || ''
  ).trim();
  if (!token) {
    throw new Error('YANDEX_DELIVERY_TOKEN is not set');
  }
  return token;
}

function jsonResponse(data, status = 200) {
  return {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: data,
  };
}

function yandexErrorToMessage(resStatus, err) {
  const raw =
    typeof err.error === 'string'
      ? err.error
      : typeof err.message === 'string'
        ? err.message
        : typeof err.code === 'string'
          ? err.code
          : typeof err.description === 'string'
            ? err.description
            : '';
  const lower = raw.toLowerCase();
  if (
    lower.includes('метод оплаты') ||
    (lower.includes('payment') && lower.includes('method'))
  ) {
    return 'В личном кабинете доставки Яндекса (dostavka.yandex.ru) подключите способ оплаты для B2B такси: Настройки → Оплата / привязка счёта.';
  }
  if (
    resStatus === 401 ||
    resStatus === 403 ||
    lower.includes('access denied') ||
    lower.includes('forbidden') ||
    lower.includes('unauthorized')
  ) {
    return 'Доступ к API доставки Яндекса запрещён. Проверьте YANDEX_DELIVERY_TOKEN: токен должен быть из личного кабинета dostavka.yandex.ru (B2B такси), не OAuth.';
  }
  if (resStatus === 404 || lower.includes('not found')) {
    return 'Сервис расчёта доставки не найден. Проверьте подключение B2B такси в dostavka.yandex.ru.';
  }
  if (lower.includes('invalid') && lower.includes('token')) {
    return 'Неверный токен доставки Яндекса. Укажите корректный YANDEX_DELIVERY_TOKEN из dostavka.yandex.ru.';
  }
  if (raw) return raw;
  if (resStatus === 502 || resStatus === 503)
    return 'Сервис доставки Яндекса временно недоступен. Попробуйте позже.';
  return 'Ошибка расчёта доставки Яндекса. Попробуйте позже или измените адрес.';
}

function yandexPlatformErrorToMessage(resStatus, err, responseText) {
  const raw =
    typeof err.message === 'string'
      ? err.message
      : typeof err.error === 'string'
        ? err.error
        : typeof err.code === 'string'
          ? err.code
          : '';
  if (/merchant not found/i.test(raw)) {
    return (
      'Яндекс: Merchant not found — значение в YANDEX_PLATFORM_MERCHANT_ID не является merchant_id в API «доставка в другой день». ' +
      'ID клиента в ЛК часто другой идентификатор. Запросите у поддержки Яндекса поле merchant_id для POST .../platform/warehouses/list.'
    );
  }
  if (/source station is invalid/i.test(raw)) {
    return (
      'Platform API: source.platform_station_id не принят (склад не найден в платформе). ' +
      'Укажите station_id из ответа POST .../platform/warehouses/list для вашего склада, либо совпадающий с point_id отправления в Cargo (YANDEX_DELIVERY_WAREHOUSE_ID). ' +
      raw
    );
  }
  if (raw && !/^parse error/i.test(raw)) return raw;
  if (resStatus === 400) {
    return (
      'Platform API: неверный запрос (400). Проверьте filter.merchant_id и тело запроса. ' +
      (responseText || '').slice(0, 500)
    );
  }
  if (resStatus === 404) {
    return (
      'Platform API (доставка в другой день): метод недоступен или не найден (404). ' +
      'Часто у токена нет доступа к API складов/мерчанта, либо неверный merchant_id, либо склад не создан в платформе. ' +
      'Уточните в поддержке Яндекса доступ к POST .../platform/warehouses/list. Ответ: ' +
      (responseText || '').slice(0, 400)
    );
  }
  if (resStatus === 401 || resStatus === 403) {
    return 'Доступ к Platform API запрещён. Проверьте токен в dostavka.yandex.ru → Интеграция.';
  }
  return raw || responseText.slice(0, 300) || `Platform API HTTP ${resStatus}`;
}

async function yandexPlatformRequest(path, options = {}) {
  const token = getToken();
  const url = `${YANDEX_PLATFORM_API_BASE}${path}`;
  const res = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let err;
    try {
      err = JSON.parse(text);
    } catch {
      err = { message: text || res.statusText };
    }
    console.error('Yandex Platform API raw error:', res.status, path, text);
    const userMsg = yandexPlatformErrorToMessage(res.status, err, text);
    throw new Error(userMsg);
  }
  return text ? JSON.parse(text) : {};
}

async function yandexRequest(path, options = {}) {
  const token = getToken();
  const url = `${YANDEX_API_BASE}${path}`;
  const res = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let err;
    try {
      err = JSON.parse(text);
    } catch {
      err = { message: text || res.statusText };
    }
    console.error('Yandex Delivery API raw error:', res.status, text);
    const userMsg = yandexErrorToMessage(res.status, err);
    throw new Error(userMsg);
  }
  return text ? JSON.parse(text) : {};
}

async function geocodeAddress(fullname) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', fullname);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'MirafloresStore/1.0' },
    });
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      const lon = parseFloat(data[0].lon);
      const lat = parseFloat(data[0].lat);
      if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat];
    }
  } catch {
    /* ignore */
  }
  return null;
}

const DEFAULT_SPB_WAREHOUSE_POINT_ID = '019c55f8c0d972ea9b59302a85430825';
const DEFAULT_SPB_WAREHOUSE_ADDRESS =
  'Россия, Санкт-Петербург, улица Ватутина, дом 8/7Д';

function getWarehousePoint() {
  const lat = process.env.YANDEX_DELIVERY_WAREHOUSE_LAT;
  const lng = process.env.YANDEX_DELIVERY_WAREHOUSE_LNG;
  const fullname =
    process.env.YANDEX_DELIVERY_WAREHOUSE_FULLNAME?.trim() ||
    DEFAULT_SPB_WAREHOUSE_ADDRESS;
  const envId = process.env.YANDEX_DELIVERY_WAREHOUSE_ID?.trim();
  const warehousePointId = envId || DEFAULT_SPB_WAREHOUSE_POINT_ID;

  if (lat && lng) {
    const lon = parseFloat(lng);
    const latN = parseFloat(lat);
    if (Number.isFinite(lon) && Number.isFinite(latN)) {
      return {
        coordinates: [lon, latN],
        fullname,
        point_id: warehousePointId,
      };
    }
  }
  return {
    coordinates: [30.379738, 59.962021],
    fullname: DEFAULT_SPB_WAREHOUSE_ADDRESS,
    point_id: warehousePointId,
  };
}

async function handleCalculate(body) {
  const { to, mode } = body;
  const pkgResolved = resolveYandexShipmentPackage(body);
  const yandexDropoffPointId = (
    to.yandex_point_id ||
    to.yandexPointId ||
    ''
  ).trim();
  const fullname =
    to.fullname || [to.city, to.street, to.building].filter(Boolean).join(', ');

  const cityInput = to.city || '';
  const cityNorm = cityInput
    .trim()
    .replace(/^(МОСКВА|Москва).*$/i, 'Москва')
    .replace(/^(САНКТ-ПЕТЕРБУРГ|Санкт-Петербург).*$/i, 'Санкт-Петербург');

  let fullnameForGeocode = fullname
    .replace(/\s*,\s*/g, ', ')
    .replace(/^МОСКВА\b/i, 'Москва')
    .replace(/^САНКТ-ПЕТЕРБУРГ\b/i, 'Санкт-Петербург');

  let coordinates = null;
  if (Array.isArray(to.coordinates) && to.coordinates.length === 2) {
    const lon = Number(to.coordinates[0]);
    const lat = Number(to.coordinates[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      coordinates = [lon, lat];
    }
  }

  if (!coordinates) {
    coordinates = await geocodeAddress(fullnameForGeocode || fullname);
  }
  if (!coordinates && fullnameForGeocode && cityNorm) {
    const streetPart = (to.street || to.building || fullnameForGeocode)
      .replace(new RegExp(`^${cityNorm}\\s+`, 'i'), '')
      .trim();
    const shortAddress = streetPart ? `${cityNorm}, ${streetPart}` : cityNorm;
    coordinates = await geocodeAddress(shortAddress);
  }
  if (!coordinates && fullnameForGeocode) {
    const withCountry = fullnameForGeocode.startsWith('Россия')
      ? fullnameForGeocode
      : `Россия, ${fullnameForGeocode}`;
    coordinates = await geocodeAddress(withCountry);
  }
  if (!coordinates) {
    return jsonResponse({
      error: 'Не удалось определить координаты адреса. Проверьте город и улицу.',
      offers: [],
    });
  }

  const warehouse = getWarehousePoint();
  const dropoffFullname =
    cityNorm && (to.street || to.building)
      ? `${cityNorm}, ${(to.street || '')
          .replace(new RegExp(`^${cityNorm}\\s+`, 'i'), '')
          .trim() || to.building}`
      : fullname;

  let dropoffFullnameForApi =
    dropoffFullname.trim() && !/^россия\b/i.test(dropoffFullname.trim())
      ? `Россия, ${dropoffFullname.trim()}`
      : dropoffFullname;
  dropoffFullnameForApi = normalizeRuAddressForYandex(dropoffFullnameForApi);

  const useYandexPvzDropoff = mode === 'pvz' && Boolean(yandexDropoffPointId);

  const pkg = useYandexPvzDropoff
    ? capYandexNddPvzPackageDims(pkgResolved)
    : pkgResolved;

  const physicalCm = toYandexPricingCalculatorDimsCm(
    pkg.dxCm,
    pkg.dyCm,
    pkg.dzCm,
  );
  const platformWeightG = Math.max(1, Math.round(pkg.totalWeightG));
  const platDx = physicalCm.dx;
  const platDy = physicalCm.dy;
  const platDz = physicalCm.dz;

  if (useYandexPvzDropoff && isHyphenatedUuidPointId(yandexDropoffPointId)) {
    console.warn(
      '[Yandex] В запросе point_id пункта доставки в формате UUID. Для offers/calculate обычно нужен `id` из pickup-points/list (hex без дефисов) или operator_station_id. Пересохраните адрес, снова выбрав ПВЗ в модалке.',
    );
  }

  const route_points = [
    {
      id: 1,
      fullname: normalizeRuAddressForYandex(warehouse.fullname),
      coordinates: warehouse.coordinates,
      ...(warehouse.point_id ? { point_id: warehouse.point_id } : {}),
    },
    {
      id: 2,
      coordinates,
      fullname: dropoffFullnameForApi,
      ...(useYandexPvzDropoff
        ? { type: 'pvz', point_id: yandexDropoffPointId }
        : {}),
    },
  ];

  const items = [
    {
      size: {
        length: physicalCm.dx / 100,
        width: physicalCm.dz / 100,
        height: physicalCm.dy / 100,
      },
      weight: Math.max(0.001, pkg.totalWeightG / 1000),
      quantity: 1,
      pickup_point: 1,
      dropoff_point: 2,
    },
  ];

  const requirements = useYandexPvzDropoff
    ? {
        taxi_classes: ['ndd'],
        skip_door_to_door: true,
        ndd: true,
        delivery_type: 'ndd',
      }
    : {
        taxi_classes: ['cargo', 'courier', 'express', 'ndd'],
        skip_door_to_door: false,
      };

  const platformSourceStationId =
    process.env.YANDEX_PLATFORM_SOURCE_STATION_ID?.trim();

  if (useYandexPvzDropoff && platformSourceStationId) {
    try {
      const destinationPrimary =
        isLikelyYandexPlatformStationId(yandexDropoffPointId)
          ? { platform_station_id: yandexDropoffPointId }
          : { address: dropoffFullnameForApi };

      const warehousePointId = warehouse.point_id?.trim() || '';
      const fallbackSourceId =
        warehousePointId &&
        isLikelyYandexPlatformStationId(warehousePointId) &&
        warehousePointId !== platformSourceStationId
          ? warehousePointId
          : '';

      const buildPricingBody = (sourceStationId, destination) => ({
        source: { platform_station_id: sourceStationId },
        destination,
        tariff: 'self_pickup',
        total_weight: platformWeightG,
        total_assessed_price: 0,
        client_price: 0,
        payment_method: 'already_paid',
        places: [
          {
            physical_dims: {
              weight_gross: platformWeightG,
              dx: platDx,
              dy: platDy,
              dz: platDz,
            },
          },
        ],
      });

      let sourceId = platformSourceStationId;
      let dest =
        typeof destinationPrimary.platform_station_id === 'string'
          ? { platform_station_id: destinationPrimary.platform_station_id }
          : { address: destinationPrimary.address };

      /** @type {{ pricing_total?: string; delivery_days?: number } | undefined} */
      let ndd;
      const maxPricingAttempts = 5;
      for (let attempt = 0; attempt < maxPricingAttempts; attempt++) {
        try {
          ndd = await yandexPlatformRequest(PLATFORM_PRICING_CALCULATOR_PATH, {
            body: buildPricingBody(sourceId, dest),
          });
          break;
        } catch (pricingErr) {
          const msg =
            pricingErr instanceof Error
              ? pricingErr.message
              : String(pricingErr);
          let adjusted = false;
          if (/source station is invalid/i.test(msg) && fallbackSourceId) {
            if (sourceId !== fallbackSourceId) {
              sourceId = fallbackSourceId;
              adjusted = true;
            }
          }
          if (
            !adjusted &&
            /no_station|station id for point|cant get station/i.test(msg) &&
            'platform_station_id' in dest
          ) {
            dest = { address: dropoffFullnameForApi };
            adjusted = true;
          }
          if (!adjusted) {
            throw pricingErr;
          }
        }
      }
      if (!ndd) {
        throw new Error('Platform pricing-calculator: не удалось получить ответ');
      }
      const rub = parsePricingTotalRub(ndd.pricing_total);
      const rubCheckout = Number.isFinite(rub) ? Math.round(rub) : NaN;
      if (Number.isFinite(rubCheckout) && rubCheckout > 0) {
        return jsonResponse({
          offers: [
            {
              price: {
                total_price: String(rubCheckout),
                total_price_with_vat: String(rubCheckout),
                base_price: String(rubCheckout),
                currency: 'RUB',
              },
              taxi_class: 'ndd_self_pickup',
              description: 'platform/pricing-calculator',
              payload: 'ndd-platform-pricing',
              offer_ttl: '',
            },
          ],
          delivery_days: ndd.delivery_days,
          _pricing_source: 'yandex_platform_ndd',
        });
      }
    } catch (nddErr) {
      console.warn(
        'Platform pricing-calculator (NDD ПВЗ) не удался, переходим к Cargo offers/calculate:',
        nddErr,
      );
    }
  } else if (!useYandexPvzDropoff && platformSourceStationId) {
    try {
      const doorAddress = addressForPlatformPricing(dropoffFullnameForApi);
      const warehousePointId = warehouse.point_id?.trim() || '';
      const fallbackSourceId =
        warehousePointId &&
        isLikelyYandexPlatformStationId(warehousePointId) &&
        warehousePointId !== platformSourceStationId
          ? warehousePointId
          : '';

      const buildDoorPricingBody = (sourceStationId) => ({
        source: { platform_station_id: sourceStationId },
        destination: { address: doorAddress },
        tariff: 'time_interval',
        total_weight: platformWeightG,
        total_assessed_price: 0,
        client_price: 0,
        payment_method: 'already_paid',
        places: [
          {
            physical_dims: {
              weight_gross: platformWeightG,
              dx: platDx,
              dy: platDy,
              dz: platDz,
            },
          },
        ],
      });

      let sourceId = platformSourceStationId;
      /** @type {{ pricing_total?: string; delivery_days?: number } | undefined} */
      let doorPricing;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          doorPricing = await yandexPlatformRequest(
            PLATFORM_PRICING_CALCULATOR_PATH,
            {
              body: buildDoorPricingBody(sourceId),
            },
          );
          break;
        } catch (pricingErr) {
          const msg =
            pricingErr instanceof Error
              ? pricingErr.message
              : String(pricingErr);
          if (
            /source station is invalid/i.test(msg) &&
            fallbackSourceId &&
            sourceId !== fallbackSourceId
          ) {
            sourceId = fallbackSourceId;
            continue;
          }
          throw pricingErr;
        }
      }
      if (doorPricing) {
        const rub = parsePricingTotalRub(doorPricing.pricing_total);
        const rubCheckout = Number.isFinite(rub) ? Math.round(rub) : NaN;
        if (Number.isFinite(rubCheckout) && rubCheckout > 0) {
          return jsonResponse({
            offers: [
              {
                price: {
                  total_price: String(rubCheckout),
                  total_price_with_vat: String(rubCheckout),
                  base_price: String(rubCheckout),
                  currency: 'RUB',
                },
                taxi_class: 'platform_time_interval',
                description: 'platform/pricing-calculator (door)',
                payload: 'platform-door-pricing',
                offer_ttl: '',
              },
            ],
            delivery_days: doorPricing.delivery_days,
            _pricing_source: 'yandex_platform_door',
          });
        }
      }
    } catch (doorErr) {
      console.warn(
        'Platform pricing-calculator (до двери, time_interval) не удался, пробуем Cargo offers/calculate:',
        doorErr,
      );
    }
  } else if (useYandexPvzDropoff && !platformSourceStationId) {
    console.log(
      '[Yandex NDD] Для расчёта «в другой день» до ПВЗ задайте YANDEX_PLATFORM_SOURCE_STATION_ID — platform_station_id склада из POST .../warehouses/list (док: 1.01 pricing-calculator). Сейчас используется только Cargo v2.',
    );
  } else if (!useYandexPvzDropoff && !platformSourceStationId) {
    console.log(
      '[Yandex door] Для межгорода до двери задайте YANDEX_PLATFORM_SOURCE_STATION_ID (station_id склада из POST .../warehouses/list). ' +
        'Иначе расчёт идёт через Cargo offers/calculate — на многих маршрутах он возвращает пустой offers.',
    );
  }

  const calculatePayload = { items, route_points, requirements };
  console.log(
    '--- Yandex offers/calculate OUT ---',
    JSON.stringify(calculatePayload, null, 2),
  );

  let result = await yandexRequest(`${CARGO_PATH}/offers/calculate`, {
    body: calculatePayload,
  });

  console.log(
    '--- Yandex Delivery Offers Result (first) ---',
    JSON.stringify(result, null, 2),
  );

  if (!result.offers?.length && !useYandexPvzDropoff) {
    const doorRetries = [
      { taxi_classes: ['cargo'], skip_door_to_door: false },
      {
        taxi_classes: ['ndd'],
        skip_door_to_door: false,
        ndd: true,
        delivery_type: 'ndd',
      },
      { taxi_classes: ['courier', 'express'], skip_door_to_door: false },
      {
        taxi_classes: ['cargo', 'courier', 'express', 'ndd'],
        skip_door_to_door: false,
        ndd: true,
        delivery_type: 'ndd',
      },
    ];
    for (let i = 0; i < doorRetries.length && !result.offers?.length; i++) {
      const req = { ...requirements, ...doorRetries[i] };
      result = await yandexRequest(`${CARGO_PATH}/offers/calculate`, {
        body: { items, route_points, requirements: req },
      });
    }
  }

  const requirementsPvz = { ...requirements };
  if (!result.offers?.length && useYandexPvzDropoff) {
    requirementsPvz.taxi_classes = ['ndd'];
    requirementsPvz.ndd = true;
    requirementsPvz.delivery_type = 'ndd';

    result = await yandexRequest(`${CARGO_PATH}/offers/calculate`, {
      body: { items, route_points, requirements: requirementsPvz },
    });
  }

  if (!result.offers?.length && !useYandexPvzDropoff) {
    const req = {
      ...requirements,
      taxi_classes: ['courier', 'express'],
      skip_door_to_door: false,
    };
    delete req.ndd;
    delete req.delivery_type;

    result = await yandexRequest(`${CARGO_PATH}/offers/calculate`, {
      body: { items, route_points, requirements: req },
    });
  }

  if (!result.offers?.length) {
    console.warn(
      'Yandex offers/calculate returned empty offers after all retries',
      {
        dropoffFullname: dropoffFullnameForApi,
        coordinates,
        warehouseCoords: warehouse.coordinates,
        warehouse_point_id: warehouse.point_id ?? null,
        dropoff_point_id: yandexDropoffPointId || null,
        lastError: result.error_messages,
      },
    );
    return jsonResponse({
      ...result,
      error:
        'По этому маршруту Cargo offers/calculate не вернул тарифы. ' +
        'Для курьера до двери (межгород) нужен Platform API pricing-calculator с тарифом time_interval и переменная YANDEX_PLATFORM_SOURCE_STATION_ID (station_id склада из warehouses/list). ' +
        'Для ПВЗ — tariff self_pickup и тот же station_id. Уточните в поддержке Яндекс Доставки, если расчёт пустой.',
      offers: result.offers || [],
    });
  }

  return jsonResponse(result);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ status: number; headers: Record<string, string>; body: unknown }>}
 */
export async function processYandexDeliveryRequest(body) {
  try {
    console.log('--- Yandex Delivery API Request ---', JSON.stringify(body, null, 2));
    const action = body?.action;

    if (action === 'calculate') {
      const out = await handleCalculate(body);
      return out;
    }

    if (action === 'list-pickup-points') {
      const filters = body;
      /** @type {Record<string, unknown>} */
      const requestBody = {};
      if (filters.geo_id != null) requestBody.geo_id = filters.geo_id;
      if (filters.type) requestBody.type = filters.type;
      if (filters.longitude) requestBody.longitude = filters.longitude;
      if (filters.latitude) requestBody.latitude = filters.latitude;
      const result = await yandexPlatformRequest(PLATFORM_PICKUP_LIST_PATH, {
        body: Object.keys(requestBody).length ? requestBody : {},
      });
      return jsonResponse(result);
    }

    if (action === 'warehouses-list') {
      const merchant_id = body.merchant_id;
      const mid =
        typeof merchant_id === 'string'
          ? merchant_id.trim()
          : '';
      const merchantResolved =
        mid || process.env.YANDEX_PLATFORM_MERCHANT_ID?.trim();
      const requestBody = {
        filter: merchantResolved ? { merchant_id: merchantResolved } : {},
      };
      const result = await yandexPlatformRequest(PLATFORM_WAREHOUSES_LIST_PATH, {
        body: requestBody,
      });
      return jsonResponse(result);
    }

    return jsonResponse(
      {
        error:
          'Unknown action. Use action: "calculate" | "list-pickup-points" | "warehouses-list"',
      },
      400,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Yandex Delivery API error:', message);
    if (
      message.startsWith('YANDEX_DELIVERY_TOKEN') ||
      message.includes('dostavka.yandex') ||
      message.includes('Проверьте') ||
      message.includes('токен')
    ) {
      return jsonResponse({ error: message }, 400);
    }
    try {
      const err = JSON.parse(message);
      const msg =
        typeof err.error === 'string'
          ? err.error
          : typeof err.message === 'string'
            ? err.message
            : typeof err.code === 'string'
              ? err.code
              : message;
      return jsonResponse({ error: msg }, 400);
    } catch {
      if (
        /merchant not found/i.test(message) ||
        message.includes('YANDEX_PLATFORM_MERCHANT_ID')
      ) {
        return jsonResponse({ error: message }, 400);
      }
      return jsonResponse({ error: message }, 500);
    }
  }
}
