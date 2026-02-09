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
}

const menuData = {
  navigation: {
    title: 'навигация',
    items: [
      { label: 'Каталог', href: '/catalog/', isExternal: false },
      { label: 'Наша история', href: '/about', isExternal: false },
      { label: 'Полезные статьи', href: '/about/articles', isExternal: false },
      { label: 'Программа благодарности', href: '/gratitude-program', isExternal: false }
    ]
  },
  info: {
    title: 'Информация',
    items: [
      { label: 'Оферта и условия пользования', href: '/terms', isExternal: false },
      { label: 'Политика конфиденциальности', href: '/privacy', isExternal: false },
      { label: 'Оплата и доставка', href: '/payment-delivery', isExternal: false },
      { label: 'FAQ', href: '/faq', isExternal: false },
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

const Footer: React.FC<FooterProps> = ({ footerImage }) => {
  const isTablet = useScreenMatch(1024);
  const isMobile = useScreenMatch(657);
  const isSmallMobile = useScreenMatch(450);

  return (
    <footer className={styles.footer} style={getHeaderStyle(location.pathname, isSmallMobile)}>
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
            <FooterMenu {...menuData.support} />
          </div>

          <div className={styles.footerBottom}>
            {socialLinks.map(text => (
              <p key={text} className={styles.fotterBottmotxt}>
                {text}
              </p>
            ))}
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
              <FooterMenu {...menuData.support} />
            </div>
          </div>

          <div className={styles.footerBottomMobile}>
            {socialLinks.map(text => (
              <p key={text} className={styles.fotterBottmotxt}>
                {text}
              </p>
            ))}
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
