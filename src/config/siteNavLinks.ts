/** Общие ссылки футера и desktop/mobile-меню (один источник правды). */

export type SiteNavLink = {
  label: string;
  href: string;
  isExternal?: boolean;
  title?: string;
  /** Видимая подпись согласия (не только title) */
  consentNote?: string;
};

export const SITE_BRAND_NAME = 'Miraflores';
export const SITE_COPYRIGHT_YEAR = new Date().getFullYear();

/** Telegram-бот поддержки (футер). */
export const SITE_TELEGRAM_HREF = 'https://t.me/Miraflores_Cosmetics_Bot';

/** Telegram-магазин / быстрые сообщения на /contacts. */
export const SITE_TELEGRAM_SHOP_HREF = 'https://t.me/miraflores_shop';

/** Публичный Telegram-канал. */
export const SITE_TELEGRAM_CHANNEL_HREF = 'https://t.me/miraflores_cosmetics';

export const SITE_WHATSAPP_HREF = 'https://wa.me/79164279237';

/**
 * MAX: профиль/чат (`https://max.ru/u/…` из QR в приложении).
 * Пока нет хеша — лендинг мессенджера (не tel:).
 */
export const SITE_MAX_HREF = 'https://max.ru/';

export const SITE_VK_HREF = 'https://vk.com/miraflores';
export const SITE_DZEN_HREF = 'https://dzen.ru/miraflores';
export const SITE_RUTUBE_HREF = 'https://rutube.ru/channel/1284540/';

export const SITE_PHONE = {
  label: '+7 (916) 427-9237',
  href: 'tel:+79164279237',
  consentNote:
    'Нажимая на ссылку, вы соглашаетесь на обработку персональных данных.',
  privacyHref: '/info/politika-konfidentsialnosti',
} as const;

export const SITE_EMAIL = {
  label: 'info@miraflores.ru',
  href: 'mailto:info@miraflores.ru',
} as const;

/** Программа благодарности — только partnerCta в футере, не дублировать в колонках. */
export const SITE_GRATITUDE_HREF = '/articles/programma-blagodarnosti-2';

export const SITE_ABOUT_LINKS: SiteNavLink[] = [
  { label: 'Наша история', href: '/about' },
  { label: 'Полезные статьи', href: '/articles' },
  {
    label: 'Программа благодарности',
    href: SITE_GRATITUDE_HREF,
  },
];

/** О компании в футере — без CTA «Программа благодарности» (она в partnerCta). */
export const SITE_FOOTER_ABOUT_LINKS: SiteNavLink[] = SITE_ABOUT_LINKS.filter(
  (l) => l.href !== SITE_GRATITUDE_HREF,
);

export const SITE_INFO_LINKS: SiteNavLink[] = [
  {
    label: 'Оферта и условия пользования',
    href: '/info/oferta-i-usloviia-polzovaniia',
  },
  {
    label: 'Политика конфиденциальности',
    href: '/info/politika-konfidentsialnosti',
  },
  { label: 'Оплата и доставка', href: '/info/oplata-i-dostavka' },
  { label: 'FAQ', href: '/faq' },
];

/**
 * Инфо-колонка футера.
 * Политика / оферта — в LEGAL; FAQ — `/faq`.
 */
export const SITE_FOOTER_INFO_LINKS: SiteNavLink[] = [
  ...SITE_FOOTER_ABOUT_LINKS,
  ...SITE_INFO_LINKS.filter(
    (l) =>
      l.href !== '/faq' &&
      l.href !== '/info/politika-konfidentsialnosti' &&
      l.href !== '/info/oferta-i-usloviia-polzovaniia',
  ),
  { label: 'FAQ', href: '/faq' },
  { label: 'Контакты', href: '/contacts' },
];

/** Юридические ссылки внизу футера */
export const SITE_FOOTER_LEGAL_LINKS: SiteNavLink[] = [
  {
    label: 'Политика конфиденциальности',
    href: '/info/politika-konfidentsialnosti',
  },
  {
    label: 'Оферта',
    href: '/info/oferta-i-usloviia-polzovaniia',
  },
  { label: 'Cookies', href: '/cookies' },
];

export function orderStatusHref(isAuth: boolean): string {
  return isAuth ? '/profile' : '/sign-in';
}

export function getMenuSupportLinks(isAuth: boolean): SiteNavLink[] {
  return [
    { label: 'Статус заказа', href: orderStatusHref(isAuth) },
    { label: 'Контакты', href: '/contacts' },
  ];
}

/**
 * Поддержка в футере: статус, email, телефон (кликабельный + видимое согласие).
 * Telegram — только справа через SITE_TELEGRAM_HREF (без дубля в колонке).
 */
export function getFooterSupportLinks(isAuth: boolean): SiteNavLink[] {
  return [
    { label: 'Статус заказа', href: orderStatusHref(isAuth) },
    {
      label: SITE_EMAIL.label,
      href: SITE_EMAIL.href,
      isExternal: true,
    },
    {
      label: SITE_PHONE.label,
      href: SITE_PHONE.href,
      isExternal: true,
      consentNote: SITE_PHONE.consentNote,
    },
  ];
}
