import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __biqatDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' && window.__biqatDeferredPrompt
      ? window.__biqatDeferredPrompt
      : null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };
    checkStandalone();

    const mql = window.matchMedia('(display-mode: standalone)');
    const onMqlChange = () => checkStandalone();
    if (mql.addEventListener) {
      mql.addEventListener('change', onMqlChange);
    }

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (window.__biqatDeferredPrompt) {
      setDeferredPrompt(window.__biqatDeferredPrompt);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) setSwReady(true);
      }).catch(() => {});
      navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => {});
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      window.__biqatDeferredPrompt = evt;
      setDeferredPrompt(evt);
    };

    const handlePreCaptured = () => {
      if (window.__biqatDeferredPrompt) {
        setDeferredPrompt(window.__biqatDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      window.__biqatDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('biqat-pwa-prompt', handlePreCaptured);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', onMqlChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('biqat-pwa-prompt', handlePreCaptured);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvt = deferredPrompt || window.__biqatDeferredPrompt;
    if (!promptEvt) return false;
    await promptEvt.prompt();
    const { outcome } = await promptEvt.userChoice;
    if (outcome === 'accepted') {
      window.__biqatDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__biqatDeferredPrompt)),
    isInstalled,
    isIOS,
    isInIframe,
    swReady,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
