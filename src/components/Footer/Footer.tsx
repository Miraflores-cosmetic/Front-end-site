import React from 'react';
import styles from './Footer.module.scss';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import lineTo from '@/assets/icons/lineTofooter.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { VIEWPORT_TABLET_MAX } from '@/constants/viewport';
import FooterMenu from './footer-menu/FooterMenu';

interface FooterProps {
  /** URL or imported image for the left side background */
  footerImage: string;
  /** Left/right padding 32px (e.g. on Product page) */
  paddingX32?: boolean;
  /** Right padding 32px (e.g. on Home page) */
  paddingRight32?: boolean;
}

const menuData = {
  navigation: {
    title: 'навигация',
    items: [
      { label: 'Каталог', href: '/catalog/', isExternal: false },
      { label: 'Наша история', href: '/about', isExternal: false },
      { label: 'Полезные статьи', href: '/articles', isExternal: false },
      { label: 'Программа благодарности', href: '/articles/programma-blagodarnosti-2', isExternal: false }
    ]
  },
  info: {
    title: 'Информация',
    items: [
      { label: 'Оферта и условия пользования', href: '/info/oferta-i-usloviia-polzovaniia', isExternal: false },
      { label: 'Политика конфиденциальности', href: '/info/politika-konfidentsialnosti', isExternal: false },
      { label: 'Оплата и доставка', href: '/info/oplata-i-dostavka', isExternal: false },
      { label: 'FAQ', href: '/#faq', isExternal: false, scrollToId: 'faq' },
      { label: 'Контакты', href: '/contacts', isExternal: false }
    ]
  },
  support: {
    title: 'Поддержка',
    items: [
      { label: 'Статус заказа', href: '/profile', isExternal: false },
      { label: 'info@miraflores.ru', href: 'mailto:info@miraflores.ru', isExternal: true },
      {
        label: '+7 (916) 427-9237',
        href: 'tel:+79164279237',
        isExternal: true,
        title: 'Нажимая на соответствующую кнопку и/или переходя по ссылке, я выражаю своё согласие на обработку моих персональных данных в соответствии с Политикой конфиденциальности.'
      },
      { label: 'Телеграм →', href: 'https://t.me/Miraflores_Cosmetics_Bot', isExternal: true }
    ]
  }
};

const socialLinks = ['Телеграмм канал', 'Pinterest', '© Miraflores 2026'];

function LegalBlock() {
  return (
    <section className={styles.legalSection} aria-label="Реквизиты">
      <p className={styles.supportLegal}>
        ИП Патрацкий Д.А.
        <br />
        ИНН 504010991802 ОГРНИП 319774600587304
      </p>
    </section>
  );
}

const Footer: React.FC<FooterProps> = ({ footerImage, paddingX32, paddingRight32 }) => {
  const isTablet = useScreenMatch(VIEWPORT_TABLET_MAX);
  const isMobile = useScreenMatch();

  return (
    <footer
      className={`${styles.footer} ${paddingX32 ? styles.footerPaddingX32 : ''} ${paddingRight32 ? styles.footerPaddingRight32 : ''}`}
    >
      {!isTablet && (
        <div className={styles.footerLeft}>
          <img src={footerImage} alt="footer" className={styles.footerBgImage} />
          <img src={siteLogo} alt='Miraflores' className={styles.footerLogo} />
        </div>
      )}

      {!isMobile ? (
        <div className={styles.footerRightWrapper}>
          <div className={styles.footerRight}>
            <FooterMenu {...menuData.navigation} />
            <FooterMenu {...menuData.info} />
            <div className={styles.supportColumn}>
              <FooterMenu {...menuData.support} />
              <LegalBlock />
            </div>
          </div>

          <div className={styles.footerBottom}>
            {socialLinks.map(text =>
              text === 'Телеграмм канал' ? (
                <a
                  key={text}
                  href="https://t.me/Miraflores_Cosmetics_Bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerBottomLink}
                >
                  {text}
                </a>
              ) : (
                <p key={text} className={styles.footerBottomText}>
                  {text}
                </p>
              )
            )}
            <span className={styles.footerPromoText}>тут промокоды</span>
            <img src={lineTo} className={styles.lineTo} alt='' />
          </div>
        </div>
      ) : (
        <div className={styles.footerMobile}>
          <div className={styles.mobileContainer}>
            <div className={styles.mobileLeft}>
              <FooterMenu {...menuData.navigation} />
            </div>

            <div className={styles.mobileRight}>
              <FooterMenu {...menuData.info} />
              <div className={styles.supportColumn}>
                <FooterMenu {...menuData.support} />
                <LegalBlock />
              </div>
            </div>
          </div>

          <div className={styles.footerBottomMobile}>
            {socialLinks.map(text =>
              text === 'Телеграмм канал' ? (
                <a
                  key={text}
                  href="https://t.me/Miraflores_Cosmetics_Bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerBottomLink}
                >
                  {text}
                </a>
              ) : (
                <p key={text} className={styles.footerBottomText}>
                  {text}
                </p>
              )
            )}
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
