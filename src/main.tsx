import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style/global.scss';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import { ToastProvider } from './components/toast/toast';
import { fetchReferralPublicSettings, postMfVisit } from './api/referralApi';
import {
  captureMfFromUrl,
  rewriteMfRefExpiry,
  setMfRefTtlDays,
} from './lib/mirafloresReferral';
import { captureYrFromUrl } from './lib/yourichAffiliate';

captureYrFromUrl();
/** Capture ASAP (may use default/cached TTL); rewrite exp after settings fetch. */
const mfBootCode = captureMfFromUrl();
if (mfBootCode) postMfVisit(mfBootCode);

/** Admin linkTtlDays → cache + переписать exp текущего ?mf= (иначе первый визит = 60д). */
void fetchReferralPublicSettings()
  .then((s) => {
    setMfRefTtlDays(s.linkTtlDays);
    rewriteMfRefExpiry();
  })
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
