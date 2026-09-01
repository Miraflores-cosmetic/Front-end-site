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
import Catalog from '@/pages/Catalog/Catalog';
import DrawerWrapper from './components/drawers/DrawerWrapper';
import SignIn from '@/pages/SignIn/SignIn';
import SignUp from '@/pages/SignUp/SignUp';
import ForgotPassword from '@/pages/ForgotPassword/ForgotPassword';
import EmailConfirmation from '@/pages/EmailConfirmation/EmailConfirmation';
import ResetPassword from '@/pages/ResetPassword/ResetPassword';
import ProductDetailPage from '@/pages/ProductDetail';
import FacePage from './pages/Face/Face';
import About from './pages/About/About';
import Order from './pages/Order/Order';
import ProfilePage from './pages/Profile/Profile';
import ReviewsPage from './pages/Reviews/ReviewsPage';
import OrderSuccess from './pages/OrderSuccess/OrderSuccess';
import FAQ from './pages/FAQ/FAQ';
import Cookies from './pages/Cookies/Cookies';
import Promocodes from './pages/Promocodes/Promocodes';
import GiftCertificates from './pages/GiftCertificates/GiftCertificates';
import { Spinner } from '@/components/spinner/Spinner';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { SiteLoader } from '@/components/SiteLoader/SiteLoader';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerStyles from '@/components/Footer/Footer.module.scss';
import { resolvePostAuthRedirect } from '@/utils/authRedirect';
import NotFound from './pages/NotFound/NotFound';
import Contacts from './pages/Contacts/Contacts';
import QuizZonePage from './pages/Quiz/QuizZone';
import QuizFacePage from './pages/Quiz/QuizFace';
import QuizHairPage from './pages/Quiz/QuizHair';
import QuizResultPage from './pages/Quiz/QuizResult';
import ProfileQuizResultPage from './pages/Profile/ProfileQuizResult';
import { QuizContentProvider } from '@/contexts/QuizContentContext';
import SearchDrawer from '@/components/drawer/SearchDrawer';
import { AppDispatch, RootState } from '@/store/store';
import { getMe, isAuthSessionInvalidMessage, clearLocalSession } from '@/store/slices/authSlice';
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute';
import { setUnauthorizedHandler } from '@/api/authSession';
import { initializeCart } from '@/store/slices/checkoutSlice';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { VIEWPORT_MOBILE_MAX } from '@/constants/viewport';

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
      <SiteLoader />
      <AppShellGate>
      <Spinner />
      <AppHeader />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/sign-in' element={<SignIn />} />
        <Route path='/sign-up' element={<SignUp />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/email-confirmation' element={<EmailConfirmation />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/login/reset-password' element={<LegacyResetPasswordRedirect />} />
        <Route path='/catalog/:cat?/:sub?' element={<Catalog />} />
        <Route path='/product/:slug' element={<ProductDetailPage />} />
        <Route path='/category/:slug' element={<CategoryToCatalogRedirect />} />
        <Route path='/face' element={<FacePage />} />
        <Route element={<QuizRoutesLayout />}>
          <Route path='/quiz' element={<QuizZonePage />} />
          <Route path='/quiz/face' element={<QuizFacePage />} />
          <Route path='/quiz/face/spf' element={<QuizFacePage />} />
          <Route path='/quiz/face/issues' element={<QuizFacePage />} />
          <Route path='/quiz/face/tasks' element={<QuizFacePage />} />
          <Route path='/quiz/face/swelling' element={<QuizFacePage />} />
          <Route path='/quiz/face/photo' element={<QuizFacePage />} />
          <Route path='/quiz/face/result' element={<QuizResultPage />} />
          <Route path='/quiz/hair' element={<QuizHairPage />} />
        </Route>
        <Route path='/about' element={<About />} />
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
            <Route path='/order' element={<Order />} />
            <Route path='/order/success' element={<OrderSuccess />} />
            <Route path='/checkout/success' element={<CheckoutSuccessAlias />} />
            <Route
              path='/profile'
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
        <Route
          path='/profile/quiz-result'
          element={
            <ProtectedRoute>
              <QuizContentProvider>
                <ProfileQuizResultPage />
              </QuizContentProvider>
            </ProtectedRoute>
          }
        />
            <Route path='/reviews' element={<ReviewsPage />} />
            <Route path='/contacts' element={<Contacts />} />
        <Route path='/faq' element={<FAQ />} />
        <Route path='/cookies' element={<Cookies />} />
            <Route path='/promocodes' element={<Promocodes />} />
            <Route path='/gift-certificates' element={<GiftCertificates />} />
            <Route path='/*' element={<NotFound />} />
      </Routes>
      <AppFooter />
      <DrawerWrapper />
      <SearchDrawer />
      </AppShellGate>
    </>
  );
};

export default App;
