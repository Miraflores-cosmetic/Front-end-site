import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style/global.scss';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import { ToastProvider } from './components/toast/toast';
import { captureYrFromUrl } from './lib/yourichAffiliate';

captureYrFromUrl();

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
