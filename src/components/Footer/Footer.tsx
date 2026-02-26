import React from 'react';
import styles from './Footer.module.scss';
import footerLogo from '@/assets/icons/footerLogo.svg';
import lineTo from '@/assets/icons/lineTofooter.svg';
import lineToMobile from '@/assets/icons/lineToMobile.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import FooterMenu from './footer-menu/FooterMenu';
import { getHeaderStyle } from '@/helpers/helpers';

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
      { label: 'Полезные статьи', href: '/about/articles', isExternal: false },
      { label: 'Программа благодарности', href: '/articles/programma-blagodarnosti-2', isExternal: false },
      { label: 'Косметическое Ателье', href: '/atelier', isExternal: false }
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
        label: '+7 (800) 890 78 99',
        href: 'tel:+78008907899',
        isExternal: true,
        title: 'Нажимая на соответствующую кнопку и/или переходя по ссылке, я выражаю своё согласие на обработку моих персональных данных в соответствии с Политикой конфиденциальности.'
      },
      { label: 'Телеграм →', href: 'https://t.me/Miraflores_Cosmetics_Bot', isExternal: true }
    ]
  }
};

const socialLinks = ['Телеграмм канал', 'Pinterest', '© Miraflores 2026'];

const Footer: React.FC<FooterProps> = ({ footerImage, paddingX32, paddingRight32 }) => {
  const isTablet = useScreenMatch(1024);
  const isMobile = useScreenMatch(657);
  const isSmallMobile = useScreenMatch(450);

  return (
    <footer
      className={`${styles.footer} ${paddingX32 ? styles.footerPaddingX32 : ''} ${paddingRight32 ? styles.footerPaddingRight32 : ''}`}
      style={getHeaderStyle(location.pathname, isSmallMobile)}
    >
      {!isTablet && (
        <div className={styles.footerLeft}>
          <img src={footerImage} alt="footer" className={styles.footerBgImage} />
          <img src={footerLogo} alt='logo' />
        </div>
      )}

      {!isMobile ? (
        <div className={styles.footerRightWrapper}>
          <div className={styles.footerRight}>
            <FooterMenu {...menuData.navigation} />
            <FooterMenu {...menuData.info} />
            <div className={styles.supportColumn}>
              <FooterMenu {...menuData.support} />
              <p className={styles.supportLegal}>
                ИП Патрацкий Д.А.
                <br />
                ИНН 504010991802 ОГРНИП 319774600587304
              </p>
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
                <p key={text} className={styles.fotterBottmotxt}>
                  {text}
                </p>
              )
            )}
            <span className={styles.bimoTxt}>тут промокоды</span>
            <img src={lineTo} className={styles.lineTo} alt='line' />
          </div>
        </div>
      ) : (
        <div className={styles.footerMobile}>
          <div className={styles.mobileContainer}>
            <div className={styles.mobileLeft}>
              <FooterMenu {...menuData.navigation} />
              <span className={styles.bimoTxtMobile}>тут промокоды</span>
              <img src={lineToMobile} className={styles.lineToMobile} alt='line' />
            </div>

            <div className={styles.mobileRight}>
              <FooterMenu {...menuData.info} />
              <div className={styles.supportColumn}>
                <FooterMenu {...menuData.support} />
                <p className={styles.supportLegal}>
                  ИП Патрацкий Д.А.
                  <br />
                  ИНН 504010991802 ОГРНИП 319774600587304
                </p>
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
                <p key={text} className={styles.fotterBottmotxt}>
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
