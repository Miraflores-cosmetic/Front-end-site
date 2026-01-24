import React, { useState, useEffect } from 'react';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { getMe, logout } from '@/store/slices/authSlice';
import { LogoutConfirmationModal } from '@/components/logout-confirmation-modal/LogoutConfirmationModal';

const ProfilePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [openAccordion, setOpenAccordion] = useState<TabId | null>(null);
  const { isAuth, me } = useSelector((state: RootState) => state.authSlice);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const isMobile = useScreenMatch(756);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/sign-in');
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    handleLogout();
  };

  const menuMobileItems = [
    {
      id: 'info' as TabId,
      label: 'ОБЩАЯ ИНФОРМАЦИЯ',
      content: <InfoMobileContent setOpenAccordion={() => setOpenAccordion(null)} />
    },
    {
      id: 'orders' as TabId,
      label: 'ЗАКАЗЫ',
      content: <OrdersContent setOpenAccordion={() => setOpenAccordion(null)} />
    },
    {
      id: 'favorites' as TabId,
      label: 'ИЗБРАННОЕ',
      content: <FavoritesContent setOpenAccordion={() => setOpenAccordion(null)} />
    },
    {
      id: 'bonus' as TabId,
      label: 'БОНУСНЫЙ СЧЕТ',
      content: <div>Контент избранного44</div>
    },
    {
      id: 'logout' as TabId,
      label: 'ВЫЙТИ',
      content: <div>Выход из аккаунта...</div>
    }
  ];

  // Обработка выхода при клике на "Выйти"
  useEffect(() => {
    if (activeTab === 'logout') {
      setIsLogoutModalOpen(true);
      // Reset active tab to previous one so it doesn't get stuck on 'logout' if user cancels
      setActiveTab('info');
    }
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return <InfoContent />;
      case 'orders':
        return <OrdersContent />;
      case 'favorites':
        return <FavoritesContent setOpenAccordion={() => setOpenAccordion(null)} />;
      case 'bonus':
        return <BonusContent />;
      case 'logout':
        return null;
    }
  };

  // Проверяем query параметр для открытия конкретного таба
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['info', 'orders', 'favorites', 'bonus'].includes(tabParam)) {
      setActiveTab(tabParam as TabId);
      // Убираем параметр из URL после установки таба (в следующем тике)
      setTimeout(() => {
        navigate('/profile', { replace: true });
      }, 0);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      // Проверяем, есть ли токен в localStorage
      const storedToken = localStorage.getItem('token');
      if (!storedToken || storedToken === 'null' || storedToken === 'undefined') {
        // Если токена нет, сразу редирект
        navigate('/sign-in');
        return;
      }

      // Если уже есть данные пользователя и авторизация подтверждена, не проверяем снова
      if (isAuth && me) {
        return;
      }

      try {
        const result = await dispatch(getMe()).unwrap();
        // Если getMe успешно выполнен, пользователь авторизован
        if (!result) {
          // Если результат null, значит пользователь не авторизован
          navigate('/sign-in');
        }
      } catch (error: any) {
        // Если токен истек или ошибка авторизации - редирект на вход
        const errorMessage = error?.message || error?.error?.message || '';
        if (
          errorMessage.includes('TokenExpired') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('PermissionDenied') ||
          errorMessage.includes('Signature has expired') ||
          errorMessage.includes('ExpiredSignatureError') ||
          errorMessage.includes('AUTHENTICATED_USER')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          // Используем window.location для гарантированного редиректа
          window.location.href = '/sign-in';
          return;
        } else {
          // Для других ошибок тоже редирект, если нет данных пользователя
          // Даем небольшую задержку, чтобы App.tsx успел восстановить авторизацию
          setTimeout(() => {
            if (!me) {
              window.location.href = '/sign-in';
            }
          }, 500);
        }
      }
    };

    // Проверяем авторизацию только один раз при монтировании
    // App.tsx уже проверит при загрузке, но если пользователь перешел на /profile напрямую
    checkAuth();
  }, []); // Пустой массив зависимостей - проверяем только при монтировании

  return (
    <main className={styles.profileContainer}>
      <Header />
      <section className={styles.contentWrapper}>
        <div className={styles.profile}>
          {/* ЛЕВАЯ КОЛОНКА */}
          <Sidebar
            userName={me?.firstName || ''}
            menuItems={menuMobileItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            openAccordion={openAccordion}
            setOpenAccordion={setOpenAccordion}
          />
          {/* ПРАВАЯ ЧАСТЬ */}
          {!isMobile && <ProfileContent activeTab={activeTab} renderContent={renderContent} />}
        </div>
      </section>
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </main>
  );
};

export default ProfilePage;
