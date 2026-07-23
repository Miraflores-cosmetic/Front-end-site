import React, { useState, useEffect, useCallback } from 'react';
import styles from './Profile.module.scss';
import Header from '@/components/Header/Header';
import Sidebar, { TabId } from './side-bar/SideBar';
import ProfileContent from './content-wrapper/ProfileContent';
import InfoContent from './contents/info-content/InfoContent';
import OrdersContent from './contents/orders-content/OrdersContent';
import BonusContent from './contents/bonuses-content/BonusContent';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import InfoMobileContent from './contents/info-content/mobile-content/InfoMobileContent';
import FavoritesContent from './contents/favorites-content/FavoritesContent';
import QuizCareContent from './contents/quiz-care/QuizCareContent';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { getMe, logout, isAuthSessionInvalidMessage } from '@/store/slices/authSlice';
import { LogoutConfirmationModal } from '@/components/logout-confirmation-modal/LogoutConfirmationModal';
import { VIEWPORT_MOBILE_MAX } from '@/constants/viewport';

const VALID_PROFILE_TABS: TabId[] = ['info', 'orders', 'favorites', 'quiz', 'bonus'];

function parseProfileTab(tabParam: string | null): TabId {
  if (tabParam && VALID_PROFILE_TABS.includes(tabParam as TabId)) {
    return tabParam as TabId;
  }
  return 'info';
}

const ProfilePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => parseProfileTab(searchParams.get('tab')));
  const [openAccordion, setOpenAccordion] = useState<TabId | null>(null);
  const { isAuth, me } = useSelector((state: RootState) => state.authSlice);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const isMobile = useScreenMatch();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/sign-in');
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    handleLogout();
  };

  const menuItems = [
    { id: 'info' as TabId, label: 'ОБЩАЯ ИНФОРМАЦИЯ' },
    { id: 'orders' as TabId, label: 'ЗАКАЗЫ' },
    { id: 'favorites' as TabId, label: 'ИЗБРАННОЕ' },
    { id: 'quiz' as TabId, label: 'МОЙ УХОД' },
    { id: 'bonus' as TabId, label: 'БОНУСНЫЙ СЧЕТ' },
    { id: 'logout' as TabId, label: 'ВЫЙТИ' },
  ];

  const renderTabContent = useCallback(
    (tab: TabId) => {
      switch (tab) {
        case 'info':
          return isMobile ? (
            <InfoMobileContent setOpenAccordion={() => setOpenAccordion(null)} />
          ) : (
            <InfoContent />
          );
        case 'orders':
          return <OrdersContent setOpenAccordion={() => setOpenAccordion(null)} />;
        case 'favorites':
          return <FavoritesContent setOpenAccordion={() => setOpenAccordion(null)} />;
        case 'quiz':
          return <QuizCareContent />;
        case 'bonus':
          return <BonusContent onCloseAccordion={() => setOpenAccordion(null)} />;
        case 'logout':
          return null;
        default:
          return null;
      }
    },
    [isMobile],
  );

  const handleSetActiveTab = useCallback(
    (tab: TabId) => {
      if (tab === 'logout') {
        setIsLogoutModalOpen(true);
        return;
      }

      setActiveTab(tab);
      if (tab === 'info') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab }, { replace: true });
      }
    },
    [setSearchParams],
  );

  // Синхронизация таба с URL (?tab=quiz сохраняется при refresh)
  useEffect(() => {
    const tab = parseProfileTab(searchParams.get('tab'));
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < VIEWPORT_MOBILE_MAX && tab !== 'info') {
      setOpenAccordion(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || storedToken === 'null' || storedToken === 'undefined') {
        navigate('/sign-in');
        return;
      }

      if (isAuth && me) {
        return;
      }

      try {
        const result = await dispatch(getMe()).unwrap();
        if (!result) {
          navigate('/sign-in');
        }
      } catch (error: any) {
        const errorMessage = String(error?.message || error?.error?.message || '');
        if (isAuthSessionInvalidMessage(errorMessage)) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          window.location.href = '/sign-in';
          return;
        }
        console.warn('[Profile] getMe не выполнен (не ошибка сессии):', errorMessage || error);
      }
    };

    checkAuth();
  }, []);

  return (
    <>
      <Header />
      <main className={styles.profileContainer}>
        <section className={styles.contentWrapper}>
          <div className={styles.profile}>
            <Sidebar
              userName={me?.firstName || ''}
              menuItems={menuItems}
              activeTab={activeTab}
              setActiveTab={handleSetActiveTab}
              openAccordion={openAccordion}
              setOpenAccordion={setOpenAccordion}
              renderTabContent={renderTabContent}
            />
            {!isMobile && (
              <ProfileContent
                activeTab={activeTab}
                renderContent={() => renderTabContent(activeTab)}
              />
            )}
          </div>
        </section>
        <LogoutConfirmationModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={confirmLogout}
        />
      </main>
    </>
  );
};

export default ProfilePage;
