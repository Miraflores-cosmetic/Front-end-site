import React from 'react';
import styles from './Header.module.scss';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useScroll } from '@/hooks/useScroll';
import HeaderLeft from './LeftSideHeader/HeaderLeftPart';
import HeaderRight from './RightSideHeader/HeaderRightPart';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const isMobile = useScreenMatch();
  const isScrolled = useScroll();
  const navigate = useNavigate();
  const handleToHome = () => {
    navigate('/');
  };
  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerContent}>
        <HeaderLeft />

        {isMobile ? (
          <div className={styles.logoMobile} onClick={handleToHome}>
            <img src={siteLogo} alt='Miraflores' />
          </div>
        ) : (
          <div className={styles.logo} onClick={handleToHome}>
            <img src={siteLogo} alt='Miraflores' />
          </div>
        )}

        <HeaderRight />
      </div>
    </header>
  );
};

export default Header;
