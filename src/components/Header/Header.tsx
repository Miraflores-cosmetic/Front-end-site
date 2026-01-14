import React from 'react';
import styles from './Header.module.scss';
import logo from '@/assets/icons/Miraflores_logo.svg';
import logoMobile from '@/assets/icons/MirafloresMobile.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useScroll } from '@/hooks/useScroll';
import HeaderLeft from './LeftSideHeader/HeaderLeftPart';
import HeaderRight from './RightSideHeader/HeaderRightPart';
import { useLocation, useNavigate } from 'react-router-dom';
import { getHeaderStyle } from '@/helpers/helpers';
const Header: React.FC = () => {
  const isMobile = useScreenMatch(450);
  const isScrolled = useScroll();
  const navigate = useNavigate();
  const handleToHome = () => {
    navigate('/');
  };
  const location = useLocation();
  return (
    <header
      className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}
      style={getHeaderStyle(location.pathname, isMobile)}
    >
      <div className={styles.headerContent}>
        <HeaderLeft />

        {isMobile ? (
          <div className={styles.logoMobile} onClick={handleToHome}>
            <img src={logoMobile} alt='Miraflores' />
          </div>
        ) : (
          <div className={styles.logo} onClick={handleToHome}>
            <img src={logo} alt='Miraflores' />
          </div>
        )}

        <HeaderRight />
      </div>
    </header>
  );
};

export default Header;
