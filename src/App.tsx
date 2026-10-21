import { Routes, Route, Navigate, useParams, Outlet, useSearchParams } from 'react-router-dom';
import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import 'react-modern-drawer/dist/index.css';
import Home from '@/pages/Home/Home';
import DrawerWrapper from './components/drawers/DrawerWrapper';
import { Spinner } from '@/components/spinner/Spinner';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { SiteLoader } from '@/components/SiteLoader/SiteLoader';
import { MetrikaRouteTracker } from '@/components/MetrikaRouteTracker';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerStyles from '@/components/Footer/Footer.module.scss';
import { resolvePostAuthRedirect } from '@/utils/authRedirect';
import { QuizContentProvider } from '@/contexts/QuizContentContext';
import SearchDrawer from '@/components/drawer/SearchDrawer';
import { OrderChatFab } from '@/components/order-chat/OrderChatFab';
import { AppDispatch, RootState } from '@/store/store';
import { getMe, isAuthSessionInvalidMessage, clearLocalSession } from '@/store/slices/authSlice';
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute';
import { setUnauthorizedHandler } from '@/api/authSession';
import { initializeCart } from '@/store/slices/checkoutSlice';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { VIEWPORT_MOBILE_MAX } from '@/constants/viewport';

const Catalog = lazy(() => import('@/pages/Catalog/Catalog'));
const SignIn = lazy(() => import('@/pages/SignIn/SignIn'));
const SignUp = lazy(() => import('@/pages/SignUp/SignUp'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword/ForgotPassword'));
const EmailConfirmation = lazy(() => import('@/pages/EmailConfirmation/EmailConfirmation'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword/ResetPassword'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetail'));
const About = lazy(() => import('./pages/About/About'));
const Order = lazy(() => import('./pages/Order/Order'));
const ProfilePage = lazy(() => import('./pages/Profile/Profile'));
const ReviewsPage = lazy(() => import('./pages/Reviews/ReviewsPage'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess/OrderSuccess'));
const OrderPay = lazy(() => import('./pages/OrderPay/OrderPay'));
const FAQ = lazy(() => import('./pages/FAQ/FAQ'));
const Cookies = lazy(() => import('./pages/Cookies/Cookies'));
const Promocodes = lazy(() => import('./pages/Promocodes/Promocodes'));
const GiftCertificates = lazy(() => import('./pages/GiftCertificates/GiftCertificates'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));
const Contacts = lazy(() => import('./pages/Contacts/Contacts'));
const QuizZonePage = lazy(() => import('./pages/Quiz/QuizZone'));
const QuizFacePage = lazy(() => import('./pages/Quiz/QuizFace'));
const QuizHairPage = lazy(() => import('./pages/Quiz/QuizHair'));
const QuizResultPage = lazy(() => import('./pages/Quiz/QuizResult'));
const ProfileQuizResultPage = lazy(() => import('./pages/Profile/ProfileQuizResult'));
const Articles = lazy(() => import('./pages/Articles/Articles'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail/ArticleDetail'));

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SpinnerLoader />}>{children}</Suspense>;
}

const AUTH_PATHS_NO_CHROME = new Set([
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/email-confirmation',
  '/reset-password',
  '/login/reset-password',
]);

/** One Header mount for the app — avoids slideDown on every SPA page change. */
const AppHeader: React.FC = () => {
  const { pathname } = useLocation();
  const isOrderMobile = useScreenMatch(VIEWPORT_MOBILE_MAX);
  if (AUTH_PATHS_NO_CHROME.has(pathname)) return null;
  if (pathname === '/order' && isOrderMobile) return null;
  return <Header />;
};

/**
 * Footer by default (incl. 404 / NotFound).
 * Hide: auth, checkout (`/order` — success keeps footer), profile cabinet.
 * Same rule as Jcos SiteShell: no Footer on auth/checkout; account also without Footer.
 */
function shouldHideFooter(pathname: string): boolean {
  if (AUTH_PATHS_NO_CHROME.has(pathname)) return true;
  if (pathname === '/order') return true;
  if (pathname.startsWith('/checkout')) return true;
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return true;
  return false;
}

const AppFooter: React.FC = () => {
  const { pathname } = useLocation();
  if (shouldHideFooter(pathname)) return null;
  const isProductPdp = pathname.startsWith('/product');
  return (
    <div className={isProductPdp ? footerStyles.pdpStickyClearance : undefined}>
      <Footer />
    </div>
  );
};

/** Редирект /about/articles/:slug → /articles/:slug (старые ссылки и закладки) */
const LegacyAboutArticleToArticles: React.FC = () => {
  const { slug } = useParams();
  return <Navigate to={`/articles/${slug ?? ''}`} replace />;
};

/** Nest / Admin historically: /login/reset-password?t=… → Front /reset-password?token=… */
const LegacyResetPasswordRedirect: React.FC = () => {
  const [sp] = useSearchParams();
  const token = (sp.get('token') || sp.get('t') || '').trim();
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return <Navigate to={`/reset-password${qs}`} replace />;
};

/** ЮKassa Nest historically used /checkout/success — alias на витрину Miraflores */
const CheckoutSuccessAlias: React.FC = () => {
  const [sp] = useSearchParams();
  const q = sp.toString();
  return <Navigate to={q ? `/order/success?${q}` : '/order/success'} replace />;
};

/** Старые URL /category/:slug → /catalog/:slug (каноникал резолвится на странице каталога) */
const CategoryToCatalogRedirect: React.FC = () => {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const q = sp.toString();
  const base = `/catalog/${encodeURIComponent(slug ?? '')}`;
  return <Navigate to={q ? `${base}?${q}` : base} replace />;
};

const QuizRoutesLayout: React.FC = () => (
  <QuizContentProvider>
    <Outlet />
  </QuizContentProvider>
);

function isHomePath(pathname: string) {
  return pathname === '/' || pathname === '';
}

/** Home preload: не монтируем UI пока SiteLoader не разрешит (после wave-in). */
const AppShellGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deferForLoader = useRef(isHomePath(window.location.pathname)).current;
  const [ready, setReady] = useState(
    () => !deferForLoader || document.body.classList.contains('--js-ready'),
  );

  useLayoutEffect(() => {
    if (ready || !deferForLoader) return;
    if (document.body.classList.contains('--js-ready')) {
      setReady(true);
    }
  }, [ready, deferForLoader]);

  useEffect(() => {
    if (ready) return;
    const sync = () => document.body.classList.contains('--js-ready');
    if (sync()) {
      setReady(true);
      return;
    }
    const mo = new MutationObserver(() => {
      if (sync()) {
        mo.disconnect();
        setReady(true);
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, [ready]);

  if (!ready) return null;
  return <div data-app-shell>{children}</div>;
};

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuth, token } = useSelector((state: RootState) => state.authSlice);
  const hasCalledGetMeRef = useRef(false);
  const hasInitializedCartRef = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(clearLocalSession());
    });
    return () => setUnauthorizedHandler(null);
  }, [dispatch]);

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
    // isAuth может быть true из token в initialState, но me ещё null — всегда тянем профиль
    if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
      hasCalledGetMeRef.current = true;
      dispatch(getMe()).catch((error: unknown) => {
        hasCalledGetMeRef.current = false;
        const errorMessage = String(
          error instanceof Error ? error.message : (error as { message?: string })?.message ?? ''
        );
        if (!isAuthSessionInvalidMessage(errorMessage)) {
          return;
        }
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        if (window.location.pathname !== '/sign-in') {
          window.location.href = '/sign-in';
        }
      });
    }
  }, []); // Пустой массив зависимостей - вызываем только один раз при монтировании

  // Редирект с auth-страниц если пользователь уже авторизован
  useEffect(() => {
    const authLandingPaths = ['/sign-in', '/sign-up', '/email-confirmation'];
    if (isAuth && authLandingPaths.includes(location.pathname)) {
      const fromState = (location.state as { from?: string } | null) ?? null;
      navigate(resolvePostAuthRedirect('/', fromState));
    }
  }, [isAuth, location.pathname, location.state, navigate]);

  return (
    <>
      <MetrikaRouteTracker />
      <SiteLoader />
      <AppShellGate>
      <Spinner />
      <AppHeader />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/sign-in' element={<LazyRoute><SignIn /></LazyRoute>} />
        <Route path='/sign-up' element={<LazyRoute><SignUp /></LazyRoute>} />
        <Route path='/forgot-password' element={<LazyRoute><ForgotPassword /></LazyRoute>} />
        <Route path='/email-confirmation' element={<LazyRoute><EmailConfirmation /></LazyRoute>} />
        <Route path='/reset-password' element={<LazyRoute><ResetPassword /></LazyRoute>} />
        <Route path='/login/reset-password' element={<LegacyResetPasswordRedirect />} />
        <Route path='/catalog/:cat?/:sub?' element={<LazyRoute><Catalog /></LazyRoute>} />
        <Route path='/product/:slug' element={<LazyRoute><ProductDetailPage /></LazyRoute>} />
        <Route path='/category/:slug' element={<CategoryToCatalogRedirect />} />
        <Route path='/face' element={<Navigate to='/catalog/kozha' replace />} />
        <Route element={<QuizRoutesLayout />}>
          <Route path='/quiz' element={<LazyRoute><QuizZonePage /></LazyRoute>} />
          <Route path='/quiz/face' element={<LazyRoute><QuizFacePage /></LazyRoute>} />
          <Route path='/quiz/face/spf' element={<LazyRoute><QuizFacePage /></LazyRoute>} />
          <Route path='/quiz/face/issues' element={<LazyRoute><QuizFacePage /></LazyRoute>} />
          <Route path='/quiz/face/tasks' element={<LazyRoute><QuizFacePage /></LazyRoute>} />
          <Route path='/quiz/face/swelling' element={<LazyRoute><QuizFacePage /></LazyRoute>} />
          <Route path='/quiz/face/photo' element={<LazyRoute><QuizFacePage /></LazyRoute>} />
          <Route path='/quiz/face/result' element={<LazyRoute><QuizResultPage /></LazyRoute>} />
          <Route path='/quiz/hair' element={<LazyRoute><QuizHairPage /></LazyRoute>} />
        </Route>
        <Route path='/about' element={<LazyRoute><About /></LazyRoute>} />
        <Route path='/atelier' element={<Navigate to='/' replace />} />
        <Route
          path='/articles'
          element={
            <LazyRoute>
              <Articles />
            </LazyRoute>
          }
        />
        <Route
          path='/articles/:slug'
          element={
            <LazyRoute>
              <ArticleDetail />
            </LazyRoute>
          }
        />
        <Route path='/about/articles' element={<Navigate to='/articles' replace />} />
        <Route path='/about/articles/:slug' element={<LegacyAboutArticleToArticles />} />
        <Route
          path='/info/:slug'
          element={
            <LazyRoute>
              <ArticleDetail />
            </LazyRoute>
          }
        />
            <Route path='/order' element={<LazyRoute><Order /></LazyRoute>} />
            <Route path='/order/pay' element={<LazyRoute><OrderPay /></LazyRoute>} />
            <Route path='/order/success' element={<LazyRoute><OrderSuccess /></LazyRoute>} />
            <Route path='/checkout/success' element={<CheckoutSuccessAlias />} />
            <Route
              path='/profile'
              element={
                <ProtectedRoute>
                  <LazyRoute>
                    <ProfilePage />
                  </LazyRoute>
                </ProtectedRoute>
              }
            />
        <Route
          path='/profile/quiz-result'
          element={
            <ProtectedRoute>
              <QuizContentProvider>
                <LazyRoute>
                  <ProfileQuizResultPage />
                </LazyRoute>
              </QuizContentProvider>
            </ProtectedRoute>
          }
        />
            <Route path='/reviews' element={<LazyRoute><ReviewsPage /></LazyRoute>} />
            <Route path='/contacts' element={<LazyRoute><Contacts /></LazyRoute>} />
        <Route path='/faq' element={<LazyRoute><FAQ /></LazyRoute>} />
        <Route path='/cookies' element={<LazyRoute><Cookies /></LazyRoute>} />
            <Route path='/promocodes' element={<LazyRoute><Promocodes /></LazyRoute>} />
            <Route path='/gift-certificates' element={<LazyRoute><GiftCertificates /></LazyRoute>} />
            <Route path='/*' element={<LazyRoute><NotFound /></LazyRoute>} />
      </Routes>
      <AppFooter />
      <DrawerWrapper />
      <SearchDrawer />
      <OrderChatFab />
      </AppShellGate>
    </>
  );
};

export default App;
