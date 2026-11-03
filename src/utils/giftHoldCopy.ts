/**
 * CAPTURE при create: баланс уменьшается сразу.
 * Авто-отмены нет: hold до оплаты или отмены (админ / ЛК / checkout abandon).
 * SLA «просрочено» в админке: ORDER_AWAITING_TTL_MINUTES (default 72 ч).
 */

/** До create: soft validate в корзине/чекауте. */
export const GIFT_HOLD_WILL_RESERVE =
  'При оформлении заказа с баланса сертификата списывается резерв до оплаты или отмены. Пока резерв активен, тот же код нельзя применить в другом заказе.';

/** После create: hard CAPTURE уже списан с баланса. */
export const GIFT_HOLD_RESERVED =
  'Код сертификата зарезервирован под этот заказ. Резерв снимется при оплате (как списание) или при отмене заказа.';

export const GIFT_HOLD_APPLIED_TOAST =
  'Сертификат применён. При оформлении с баланса будет списан резерв до оплаты или отмены.';

export const GIFT_HOLD_CAPTURED_TOAST = GIFT_HOLD_RESERVED;

/** Личный кабинет / неоплаченный заказ с CAPTURE. */
export const GIFT_HOLD_ACCOUNT_UNPAID =
  'С сертификата уже списан резерв по этому заказу. Код заморожен до оплаты или отмены.';
