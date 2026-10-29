import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __biqatDeferredPrompt?: BeforeInstallPromptEvent | null;
    __biqatUpdateSW?: (reloadPage?: boolean) => Promise<void>;
    __biqatSwOfflineReady?: boolean;
    __biqatSwNeedRefresh?: boolean;
  }
}

async function inspectBrowserCacheCount(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const names = await window.caches.keys();
    let count = 0;
    for (const name of names) {
      const cache = await window.caches.open(name);
      const keys = await cache.keys();
      count += keys.length;
    }
    return count;
  } catch {
    return 0;
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
  const [swReady, setSwReady] = useState<boolean>(() =>
    typeof window !== 'undefined' ? Boolean(window.__biqatSwOfflineReady) : false
  );
  const [swControlling, setSwControlling] = useState<boolean>(() =>
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? Boolean(navigator.serviceWorker.controller)
      : false
  );
  const [swVersion, setSwVersion] = useState<string>('biqat-sw-v3.3');
  const [cachedAssetCount, setCachedAssetCount] = useState<number>(0);
  const [needRefresh, setNeedRefresh] = useState<boolean>(() =>
    typeof window !== 'undefined' ? Boolean(window.__biqatSwNeedRefresh) : false
  );
  const [isWarmingCache, setIsWarmingCache] = useState<boolean>(false);

  const refreshCacheStats = useCallback(async () => {
    const count = await inspectBrowserCacheCount();
    setCachedAssetCount(count);
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setSwControlling(true);
      navigator.serviceWorker.controller.postMessage({ type: 'GET_SW_STATUS' });
    }
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
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

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'BIQAT_CACHE_STATUS') {
        if (typeof data.cachedCount === 'number') {
          setCachedAssetCount(data.cachedCount);
        }
        if (typeof data.version === 'string') {
          setSwVersion(data.version);
        }
        setSwReady(true);
        setIsWarmingCache(false);
      }
    };

    const onControllerChange = () => {
      setSwControlling(Boolean(navigator.serviceWorker.controller));
      setSwReady(true);
      void refreshCacheStats();
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) {
            setSwReady(true);
            if (reg.waiting) setNeedRefresh(true);
          }
        })
        .catch(() => {});

      navigator.serviceWorker.ready
        .then(() => {
          setSwReady(true);
          setSwControlling(Boolean(navigator.serviceWorker.controller));
          void refreshCacheStats();
        })
        .catch(() => {});
    }

    void refreshCacheStats();

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

    const handleSwNeedRefresh = () => setNeedRefresh(true);
    const handleSwOfflineReady = () => {
      setSwReady(true);
      void refreshCacheStats();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('biqat-pwa-prompt', handlePreCaptured);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('biqat-sw-need-refresh', handleSwNeedRefresh);
    window.addEventListener('biqat-sw-offline-ready', handleSwOfflineReady);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', onMqlChange);
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('biqat-pwa-prompt', handlePreCaptured);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('biqat-sw-need-refresh', handleSwNeedRefresh);
      window.removeEventListener('biqat-sw-offline-ready', handleSwOfflineReady);
    };
  }, [refreshCacheStats]);

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

  const warmOfflineCache = useCallback(async () => {
    setIsWarmingCache(true);
    try {
      const resourceUrls =
        typeof performance !== 'undefined' && performance.getEntriesByType
          ? (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
              .map((r) => r.name)
              .filter(
                (u) =>
                  u.startsWith(window.location.origin) ||
                  u.includes('fonts.googleapis.com') ||
                  u.includes('fonts.gstatic.com')
              )
          : [];

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const targetSw = navigator.serviceWorker.controller || reg?.active;
        if (targetSw) {
          targetSw.postMessage({ type: 'WARM_CACHE', urls: resourceUrls });
        }
      }

      // Also ensure core shell cache exists directly if Cache API is available
      if ('caches' in window) {
        const cache = await window.caches.open('biqat-shell-v3.3');
        await Promise.allSettled(
          [
            '/',
            '/index.html',
            '/offline.html',
            '/manifest.webmanifest',
            '/icon.svg',
            '/pwa-192x192.png',
            '/pwa-512x512.png',
            '/og-social-card.png',
          ].map((u) =>
            fetch(u).then((res) => {
              if (res && res.ok) return cache.put(u, res);
            })
          )
        );
      }
      await refreshCacheStats();
    } finally {
      setIsWarmingCache(false);
    }
  }, [refreshCacheStats]);

  const rebuildOfflineCache = useCallback(async () => {
    setIsWarmingCache(true);
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_SW_CACHES' });
      } else if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      await warmOfflineCache();
    } finally {
      setIsWarmingCache(false);
    }
  }, [warmOfflineCache]);

  const applySwUpdate = useCallback(async () => {
    setNeedRefresh(false);
    window.__biqatSwNeedRefresh = false;
    if (window.__biqatUpdateSW) {
      await window.__biqatUpdateSW(true);
      return;
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    }
  }, []);

  return {
    isInstallable: Boolean(
      deferredPrompt || (typeof window !== 'undefined' && window.__biqatDeferredPrompt)
    ),
    isInstalled,
    isIOS,
    isInIframe,
    swReady,
    swControlling,
    swVersion,
    cachedAssetCount,
    needRefresh,
    isWarmingCache,
    install,
    warmOfflineCache,
    rebuildOfflineCache,
    applySwUpdate,
    dismissUpdate: () => setNeedRefresh(false),
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
