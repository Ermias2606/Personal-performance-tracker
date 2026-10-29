import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    __biqatUpdateSW?: (reloadPage?: boolean) => Promise<void>;
    __biqatSwOfflineReady?: boolean;
    __biqatSwNeedRefresh?: boolean;
  }
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.__biqatSwNeedRefresh = true;
    window.dispatchEvent(new Event('biqat-sw-need-refresh'));
  },
  onOfflineReady() {
    window.__biqatSwOfflineReady = true;
    window.dispatchEvent(new Event('biqat-sw-offline-ready'));
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Periodically check for SW updates every 60 minutes while online
    setInterval(() => {
      if (navigator.onLine) {
        registration.update().catch(() => {});
      }
    }, 60 * 60 * 1000);
  },
});

window.__biqatUpdateSW = updateSW;

createRoot(document.getElementById('root')!).render(<App />);
