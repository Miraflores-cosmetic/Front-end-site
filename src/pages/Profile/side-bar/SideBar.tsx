import React from 'react';
import { Link } from 'react-router-dom';
import styles from './SideBar.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';

export type TabId = 'info' | 'orders' | 'favorites' | 'quiz' | 'logout';

export interface MenuItem {
  id: TabId;
  label: string;
}

export interface SidebarProps {
  menuItems: MenuItem[];
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  openAccordion: TabId | null;
  setOpenAccordion: React.Dispatch<React.SetStateAction<TabId | null>>;
  renderTabContent: (tab: TabId) => React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({
  menuItems,
  activeTab,
  setActiveTab,
  openAccordion,
  setOpenAccordion,
  renderTabContent,
}) => {
  const isMobile = useScreenMatch();

  const handleClick = (id: TabId) => {
    if (id === 'logout') {
      setActiveTab('logout');
      return;
    }

    if (isMobile) {
      setOpenAccordion(prev => (prev === id ? null : id));
      setActiveTab(id);
      return;
    }

    setActiveTab(id);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.nameMenuWrapper}>
        {isMobile ? (
          <div className={styles.header}>
            <button
              type="button"
              className={styles.logoutLink}
              onClick={() => handleClick('logout')}
            >
              ВЫЙТИ
            </button>
          </div>
        ) : null}

        <nav className={styles.menu} aria-label="Разделы личного кабинета">
          <ul className={styles.menuList}>
            {menuItems
              .filter(item => !isMobile || item.id !== 'logout')
              .map(item => {
                const isOpen = isMobile && openAccordion === item.id;
                return (
                  <li key={item.id} className={styles.menuItemWrapper}>
                    <button
                      type="button"
                      className={`${styles.menuItem} ${activeTab === item.id ? styles.active : ''}`}
                      aria-expanded={isMobile ? isOpen : undefined}
                      aria-controls={isMobile ? `profile-panel-${item.id}` : undefined}
                      onClick={() => handleClick(item.id)}
                    >
                      {item.label}
                      <span
                        className={activeTab === item.id ? styles.activeDot : styles.notActiveDot}
                        aria-hidden
                      />
                    </button>
                    {isOpen && item.id !== 'logout' ? (
                      <div id={`profile-panel-${item.id}`} className={styles.accordionContent}>
                        {renderTabContent(item.id)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </nav>
      </div>

      {!isMobile ? (
        <div className={styles.support}>
          <p>Нужна помощь?</p>
          <Link to="/contacts">Свяжитесь с нами</Link>
        </div>
      ) : null}
    </aside>
  );
};

export default Sidebar;
