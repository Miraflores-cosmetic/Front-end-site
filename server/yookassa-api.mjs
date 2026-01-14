import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
  console.error('⚠️  WARNING: YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY not set in .env file!');
}

/**
 * Выполнить запрос к YooKassa API
 */
async function yookassaRequest(
  endpoint,
  options = {}
) {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error('YooKassa credentials not configured');
  }

  const { method = 'POST', body } = options;
  const url = `${YOOKASSA_API_URL}/${endpoint}`;

  // Базовая авторизация для YooKassa API
  const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      'Idempotence-Key': `${Date.now()}-${Math.random()}`,
    },
  };

  if (body && (method === 'POST' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log(`[YooKassa API] ${method} ${url}`);
  
  return fetch(url, fetchOptions);
}

// POST Handler - Создание платежа
// Обрабатываем запросы как с префиксом /api/yookassa, так и без него (через прокси)
app.post('/create-payment', async (req, res) => {
  try {
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      return res.status(500).json({ error: 'YooKassa credentials not configured' });
    }

    const {
      amount,
      currency = 'RUB',
      description,
      orderId,
      returnUrl,
      metadata = {},
    } = req.body;

    // Валидация обязательных полей
    if (!amount || !description) {
      return res.status(400).json({ error: 'Amount and description are required' });
    }

    // Формируем URL для возврата после оплаты
    const defaultReturnUrl = returnUrl || 
      `${req.headers.origin || 'http://localhost:5173'}/order/success`;

    // Данные для создания платежа
    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: currency,
      },
      confirmation: {
        type: 'embedded',
        return_url: defaultReturnUrl,
      },
      capture: true,
      description: description,
      metadata: {
        orderId: orderId || '',
        ...metadata,
      },
    };

    console.log('[YooKassa API] Creating payment:', paymentData);

    // Создаём платеж
    const response = await yookassaRequest('payments', {
      method: 'POST',
      body: paymentData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[YooKassa API] Error:', result);
      return res.status(response.status).json({
        error: result.description || 'Failed to create payment',
        details: result,
      });
    }

    // Возвращаем confirmation_token для виджета
    const confirmationToken = result.confirmation?.confirmation_token;

    if (!confirmationToken) {
      console.error('[YooKassa API] No confirmation_token in response:', result);
      return res.status(500).json({ error: 'No confirmation token received from YooKassa' });
    }

    console.log('[YooKassa API] Payment created:', {
      paymentId: result.id,
      confirmationToken: confirmationToken.substring(0, 20) + '...',
    });

    return res.json({
      success: true,
      paymentId: result.id,
      confirmationToken: confirmationToken,
      status: result.status,
      amount: result.amount,
    });

  } catch (error) {
    console.error('[YooKassa API] POST error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`YooKassa API server running on http://localhost:${PORT}`);
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    console.error('⚠️  WARNING: YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY not set in .env file!');
  } else {
    console.log(`✅ YooKassa credentials found (Shop ID: ${YOOKASSA_SHOP_ID.substring(0, 4)}...)`);
  }
});

