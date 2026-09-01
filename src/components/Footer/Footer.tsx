import React, { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { LogoPaths } from '@/components/SiteLoader/LogoPaths';
import type { RootState } from '@/store/store';
import {
  SITE_BRAND_NAME,
  SITE_COPYRIGHT_YEAR,
  SITE_FOOTER_INFO_LINKS,
  SITE_FOOTER_LEGAL_LINKS,
  SITE_GRATITUDE_HREF,
  SITE_PHONE,
  SITE_TELEGRAM_HREF,
  getFooterSupportLinks,
  type SiteNavLink,
} from '@/config/siteNavLinks';
import styles from './Footer.module.scss';

/**
 * Footer chrome (см. AppFooter в App.tsx):
 * — по умолчанию на всех страницах витрины;
 * — скрыт: auth, checkout (/order), кабинет (/profile…);
 * — 404 (NotFound) — с футером.
 * Как Jcos SiteShell: account без Footer, auth/checkout без Footer.
 *
 * Каталог только через /catalog/… (не /category/).
 */

const FOOTER_RIGHT_HOME = '#F6F5EF';
const FOOTER_RIGHT_CATALOG = '#E4EDE8';
const FOOTER_RIGHT_PRODUCT = '#EDE4DC';

const FOOTER_RIGHT_OTHER = [
  '#E8F0E3',
  '#F5E6D3',
  '#E3EEF5',
  '#F0E8F5',
  '#E8F5F0',
  '#F5F0E3',
  '#EDE4DC',
  '#E4EDE8',
] as const;

function hashPathname(pathname: string): number {
  let h = 0;
  for (let i = 0; i < pathname.length; i++) {
    h = (h * 31 + pathname.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function footerRightBackground(pathname: string): string {
  if (pathname === '/' || pathname === '') return FOOTER_RIGHT_HOME;
  if (pathname.startsWith('/product/')) return FOOTER_RIGHT_PRODUCT;
  if (pathname === '/catalog' || pathname.startsWith('/catalog/')) {
    return FOOTER_RIGHT_CATALOG;
  }
  const idx = hashPathname(pathname) % FOOTER_RIGHT_OTHER.length;
  return FOOTER_RIGHT_OTHER[idx]!;
}

function FooterNavLink({
  item,
  consentId,
  className,
}: {
  item: SiteNavLink;
  consentId?: string;
  className?: string;
}) {
  const describedBy = item.consentNote && consentId ? consentId : undefined;

  if (item.isExternal) {
    return (
      <a
        href={item.href}
        className={className}
        target={item.href.startsWith('http') ? '_blank' : undefined}
        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        title={item.title}
        aria-describedby={describedBy}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link
      to={item.href}
      className={className}
      title={item.title}
      aria-describedby={describedBy}
    >
      {item.label}
    </Link>
  );
}

const Footer: React.FC = () => {
  const { pathname } = useLocation();
  const logoRef = useRef<HTMLDivElement>(null);
  const isAuth = useSelector((state: RootState) => state.authSlice.isAuth);
  const navItems = useSelector((state: RootState) => state.nav.items);
  const supportLinks = getFooterSupportLinks(isAuth);
  const rightBg = useMemo(() => footerRightBackground(pathname), [pathname]);

  const catalogLinks = useMemo(() => {
    const items = navItems
      .filter((item) => item.category?.slug)
      .map((item) => ({
        href: `/catalog/${encodeURIComponent(item.category.slug)}`,
        label: item.name,
      }));
    return items.length ? items : [{ href: '/catalog', label: 'Каталог' }];
  }, [navItems]);

  /* Скролл: начало ведёт, конец догоняет (как в Jcos). */
  useEffect(() => {
    const root = logoRef.current;
    if (!root) return;
    const letters = Array.from(
      root.querySelectorAll<HTMLElement>('.logo-wave__letter'),
    );
    if (!letters.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const n = letters.length;
    const lag = new Array<number>(n).fill(0);
    const maxLag = 36;
    let lastScroll = window.scrollY;
    let raf = 0;

    const paint = () => {
      let alive = false;
      lag[0]! *= 0.86;
      if (Math.abs(lag[0]!) > 0.08) alive = true;

      for (let i = 1; i < n; i++) {
        lag[i]! += (lag[i - 1]! - lag[i]!) * 0.28;
        lag[i]! *= 0.97;
        if (Math.abs(lag[i]!) > 0.08) alive = true;
      }

      for (let i = 0; i < n; i++) {
        letters[i]!.style.transform = `translate3d(0, ${lag[i]}px, 0)`;
      }

      if (alive) raf = requestAnimationFrame(paint);
      else raf = 0;
    };

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScroll;
      lastScroll = y;
      if (dy === 0) return;

      lag[0] = Math.max(-maxLag, Math.min(maxLag, lag[0]! + dy * 0.55));
      if (!raf) raf = requestAnimationFrame(paint);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      for (const el of letters) el.style.transform = '';
    };
  }, []);

  const phoneConsentId = 'footer-phone-consent';

  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.left}>
          <nav className={styles.columns} aria-label="Футер">
            <div className={styles.column}>
              <h2 className={styles.columnTitle}>Каталог</h2>
              <div className={styles.columnLinks}>
                {catalogLinks.map((link) => (
                  <Link key={link.href} to={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.column}>
              <h2 className={styles.columnTitle}>Инфо</h2>
              <div className={styles.columnLinks}>
                {SITE_FOOTER_INFO_LINKS.map((link) => (
                  <FooterNavLink
                    key={`${link.href}-${link.label}`}
                    item={link}
                  />
                ))}
              </div>
            </div>

            <div className={styles.column}>
              <h2 className={styles.columnTitle}>Поддержка</h2>
              <div className={styles.columnLinks}>
                {supportLinks.map((link) => {
                  const isPhone = link.href === SITE_PHONE.href;
                  return (
                    <React.Fragment key={`${link.href}-${link.label}`}>
                      <FooterNavLink
                        item={link}
                        consentId={isPhone ? phoneConsentId : undefined}
                      />
                      {isPhone && link.consentNote ? (
                        <p id={phoneConsentId} className={styles.consentNote}>
                          {link.consentNote}{' '}
                          <Link to={SITE_PHONE.privacyHref}>
                            Политика конфиденциальности
                          </Link>
                        </p>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className={styles.leftBottom}>
            <aside
              className={styles.partnerCta}
              aria-label="Программа благодарности"
            >
              <p className={styles.partnerCtaTitle}>Программа благодарности</p>
              <p className={styles.partnerCtaText}>
                Подарки при заказе от 5&nbsp;000₽ —
                <br />
                узнайте условия и выбирайте уход
                в&nbsp;подарок к&nbsp;покупке.
              </p>
              <Link to={SITE_GRATITUDE_HREF} className={styles.partnerCtaLink}>
                Подробнее
              </Link>
            </aside>

            <div className={styles.leftBottomMeta}>
              <div className={styles.legalLinks}>
                {SITE_FOOTER_LEGAL_LINKS.map((link) => (
                  <FooterNavLink
                    key={link.href}
                    item={link}
                    className={styles.legalLink}
                  />
                ))}
              </div>
              <div className={styles.metaAside}>
                <span className={styles.copyright}>
                  © {SITE_BRAND_NAME} {SITE_COPYRIGHT_YEAR}
                </span>
                <p className={styles.legalRequisites}>
                  ИП Патрацкий Д.А.
                  <br />
                  ИНН 504010991802 ОГРНИП 319774600587304
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.right} style={{ background: rightBg }}>
          <div className={styles.rightTop}>
            <Link
              to={isAuth ? '/profile' : '/sign-in'}
              className={styles.rightLink}
            >
              {isAuth ? 'Профиль' : 'Вход'}
            </Link>
            <a
              href={SITE_TELEGRAM_HREF}
              className={styles.rightLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Телеграм
            </a>
          </div>

          <div className={styles.rightLogoSlot}>
            <div ref={logoRef} className={styles.rightLogo}>
              <Link
                to="/"
                className={styles.rightLogoHome}
                aria-label={`${SITE_BRAND_NAME} — на главную`}
              >
                <LogoPaths className={styles.rightLogoMark} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
