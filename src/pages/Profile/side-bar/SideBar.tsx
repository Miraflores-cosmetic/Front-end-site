import React from 'react';
import styles from './SideBar.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import krem from '@/assets/images/Cream.png';
import girlwithsmile from '@/assets/images/girlsmile.webp';
import Bestsellers from '@/components/bestsellers/Bestsellers';

export type TabId = 'info' | 'orders' | 'favorites' | 'bonus' | 'logout';

export interface MenuItem {
  id: TabId;
  label: string;
  content?: React.ReactNode; // контент, который откроется в аккордеоне на мобилке
}

export interface SidebarProps {
  userName: string;
  menuItems: MenuItem[];
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  openAccordion: TabId | null; // 🔹 new prop
  setOpenAccordion: React.Dispatch<React.SetStateAction<TabId | null>>; // ✅ correct typing
}

const Sidebar: React.FC<SidebarProps> = ({
  userName,
  menuItems,
  activeTab,
  setActiveTab,
  openAccordion,
  setOpenAccordion
}) => {
  const isMobile = useScreenMatch(756);

  const handleClick = (id: TabId) => {
    // Если кликнули на "Выйти", вызываем обработчик через setActiveTab
    // (обработка будет в Profile.tsx через renderContent)
    if (isMobile) {
      // при мобилке: открываем/закрываем аккордеон
      setOpenAccordion(prev => (prev === id ? null : id));
      setActiveTab(id);
    } else {
      // при десктопе: просто активируем вкладку
      setActiveTab(id);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.nameMenuWrapper}>
        <div className={styles.header}>
          <h1 className={styles.userName}>{userName}</h1>
          {isMobile && (
            <span className={styles.logoutLink} onClick={() => handleClick('logout')}>
              ВЫЙТИ
            </span>
          )}
        </div>

        <nav className={styles.menu}>
          {menuItems
            .filter(item => item.id !== 'bonus')
            .filter(item => !isMobile || item.id !== 'logout')
            .map(item => (
              <div key={item.id} className={styles.menuItemWrapper}>
                <li
                  className={`${styles.menuItem} ${activeTab === item.id ? styles.active : ''}`}
                  onClick={() => handleClick(item.id)}
                >
                  {item.label}
                  <div className={activeTab === item.id ? styles.activeDot : styles.notActiveDot} />
                </li>
                {isMobile && openAccordion === item.id && item.content && (
                  <div className={styles.accordionContent}>{item.content}</div>
                )}
              </div>
            ))}
        </nav>
      </div>
      {isMobile && <Bestsellers />}

      {!isMobile && (
        <div className={styles.support}>
          <p>Нужна помощь?</p>
          <a href='#'>Свяжитесь с нами</a>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
