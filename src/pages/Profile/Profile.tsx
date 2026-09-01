import React, { useState, useEffect, useCallback } from 'react';
import styles from './Profile.module.scss';
import Sidebar, { TabId } from './side-bar/SideBar';
import ProfileContent from './content-wrapper/ProfileContent';
import InfoContent from './contents/info-content/InfoContent';
import OrdersContent from './contents/orders-content/OrdersContent';
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

const VALID_PROFILE_TABS: TabId[] = ['info', 'orders', 'favorites', 'quiz'];

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
    void dispatch(logout()).finally(() => {
      navigate('/sign-in');
    });
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
    { id: 'logout' as TabId, label: 'ВЫЙТИ' },
  ];

  const renderTabContent = useCallback(
    (tab: TabId) => {
      switch (tab) {
        case 'info':
          return isMobile ? (
            <InfoMobileContent setOpenAccordion={setOpenAccordion} />
          ) : (
            <InfoContent />
          );
        case 'orders':
          return <OrdersContent setOpenAccordion={setOpenAccordion} />;
        case 'favorites':
          return <FavoritesContent setOpenAccordion={setOpenAccordion} />;
        case 'quiz':
          return <QuizCareContent setOpenAccordion={setOpenAccordion} />;
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

  useEffect(() => {
    const tab = parseProfileTab(searchParams.get('tab'));
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < VIEWPORT_MOBILE_MAX && tab !== 'info') {
      setOpenAccordion(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuth && me) {
        return;
      }

      try {
        const result = await dispatch(getMe()).unwrap();
        if (!result) {
          navigate('/sign-in');
        }
      } catch (error: unknown) {
        const errorMessage = String(
          (error as { message?: string; error?: { message?: string } })?.message ||
            (error as { error?: { message?: string } })?.error?.message ||
            '',
        );
        if (isAuthSessionInvalidMessage(errorMessage)) {
          navigate('/sign-in');
          return;
        }
        console.warn('[Profile] getMe не выполнен (не ошибка сессии):', errorMessage || error);
      }
    };

    void checkAuth();
  }, [dispatch, isAuth, me, navigate]);

  return (
    <>
      <main className={styles.profileContainer}>
        <section className={styles.contentWrapper}>
          <div className={styles.profile}>
            <Sidebar
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
