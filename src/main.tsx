import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style/global.scss';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import { ToastProvider } from './components/toast/toast';
import { fetchReferralPublicSettings } from './api/referralApi';
import { captureMfFromUrl, setMfRefTtlDays } from './lib/mirafloresReferral';
import { captureYrFromUrl } from './lib/yourichAffiliate';

captureYrFromUrl();
captureMfFromUrl();

/** Admin linkTtlDays → localStorage TTL для следующих ?mf= (и текущий cache). */
void fetchReferralPublicSettings()
  .then((s) => setMfRefTtlDays(s.linkTtlDays))
  .catch(() => {
    /* keep cached / default 60d */
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Provider store={store}>
          <App />
        </Provider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
