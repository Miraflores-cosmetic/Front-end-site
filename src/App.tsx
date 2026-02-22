import { Routes, Route } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import 'react-modern-drawer/dist/index.css';
import Home from '@/pages/Home/Home';
import Catalog from '@/pages/Catalog/Catalog';
import DrawerWrapper from './components/drawers/DrawerWrapper';
import SignIn from '@/pages/SignIn/SignIn';
import SignUp from '@/pages/SignUp/SignUp';
import ForgotPassword from '@/pages/ForgotPassword/ForgotPassword';
import EmailConfirmation from '@/pages/EmailConfirmation/EmailConfirmation';
import ResetPassword from '@/pages/ResetPassword/ResetPassword';
import BestSeller from '@/pages/BestSeller/BestSeller';
import FacePage from './pages/Face/Face';
import Articles from './pages/Articles/Articles';
import ArticleDetail from './pages/ArticleDetail/ArticleDetail';
import About from './pages/About/About';
import Atelier from './pages/Atelier/Atelier';
import Category from '@/pages/Category/Category'
import Order from './pages/Order/Order';
import ProfilePage from './pages/Profile/Profile';
import ReviewsPage from './pages/Reviews/ReviewsPage';
import CreateReviewPage from './pages/Reviews/CreateReviewPage';
import OrderSuccess from './pages/OrderSuccess/OrderSuccess';
import FAQ from './pages/FAQ/FAQ';
import Promocodes from './pages/Promocodes/Promocodes';
import GiftCertificates from './pages/GiftCertificates/GiftCertificates';
import { Spinner } from '@/components/spinner/Spinner';
import NotFound from './pages/NotFound/NotFound';
import SearchDrawer from '@/components/drawer/SearchDrawer';
import { AppDispatch, RootState } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { initializeCart } from '@/store/slices/checkoutSlice';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuth, token } = useSelector((state: RootState) => state.authSlice);
  const hasCalledGetMeRef = useRef(false);
  const hasInitializedCartRef = useRef(false);

  // Инициализируем корзину при загрузке приложения
  useEffect(() => {
    if (!hasInitializedCartRef.current) {
      hasInitializedCartRef.current = true;
      dispatch(initializeCart());
    }
  }, [dispatch]);

  // Проверяем токен при загрузке приложения и восстанавливаем авторизацию
  useEffect(() => {
    // Вызываем getMe только один раз при монтировании компонента
    if (hasCalledGetMeRef.current) {
      return;
    }

    const storedToken = localStorage.getItem('token');
    if (storedToken && storedToken !== 'null' && storedToken !== 'undefined' && !isAuth) {
      hasCalledGetMeRef.current = true;
      // Вызываем getMe только если пользователь еще не авторизован
      dispatch(getMe()).catch((error: any) => {
        hasCalledGetMeRef.current = false; // Сбрасываем флаг при ошибке, чтобы можно было повторить
        // Если токен невалидный или истек после попытки обновления, очищаем localStorage
        const errorMessage = error?.message || error?.error?.message || '';
        if (
          errorMessage.includes('TokenExpired') || 
          errorMessage.includes('expired') || 
          errorMessage.includes('PermissionDenied') ||
          errorMessage.includes('Signature has expired') ||
          errorMessage.includes('ExpiredSignatureError')
        ) {
          // Проверяем, есть ли refreshToken для попытки обновления
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken || refreshToken === 'null' || refreshToken === 'undefined') {
            // Если нет refreshToken, очищаем и редиректим
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userId');
            if (window.location.pathname !== '/sign-in') {
              window.location.href = '/sign-in';
            }
          }
          // Если есть refreshToken, graphqlRequest сам попытается обновить токен
        }
      });
    }
  }, []); // Пустой массив зависимостей - вызываем только один раз при монтировании

  // Редирект с sign-in если пользователь уже авторизован
  useEffect(() => {
    if (isAuth && location.pathname === '/sign-in') {
      navigate('/');
    }
  }, [isAuth, location.pathname, navigate]);

  return (
    <>
      <Spinner />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/sign-in' element={<SignIn />} />
        <Route path='/sign-up' element={<SignUp />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/email-confirmation' element={<EmailConfirmation />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/catalog/' element={<Catalog />} />
        <Route path='/product/:slug' element={<BestSeller />} />
        <Route path='/category/:slug' element={<Category />} />
        <Route path='/face' element={<FacePage />} />
        <Route path='/about' element={<About />} />
        <Route path='/atelier' element={<Atelier />} />
        <Route path='/about/articles' element={<Articles />} />
        <Route path='/about/articles/:slug' element={<ArticleDetail />} />
        <Route path='/info/:slug' element={<ArticleDetail />} />
            <Route path='/order' element={<Order />} />
            <Route path='/order/success' element={<OrderSuccess />} />
            <Route path='/profile' element={<ProfilePage />} />
            <Route path='/reviews' element={<ReviewsPage />} />
            <Route path='/reviews/create' element={<CreateReviewPage />} />
            <Route path='/faq' element={<FAQ />} />
            <Route path='/promocodes' element={<Promocodes />} />
            <Route path='/gift-certificates' element={<GiftCertificates />} />
            <Route path='/*' element={<NotFound />} />
      </Routes>
      <DrawerWrapper />
      <SearchDrawer />
    </>
  );
};

export default App;
