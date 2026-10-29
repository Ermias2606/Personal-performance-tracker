import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {ManifestOptions, VitePWA} from 'vite-plugin-pwa';

const pwaManifest: Partial<ManifestOptions> & Record<string, unknown> = {
  id: '/',
  name: 'Biqat KPI — Personal & Branch Performance Tracker',
  short_name: 'Biqat KPI',
  description:
    'Plan branch KPI targets, cascade annual to 12-month personal goals, log offline actuals, and export appraisal reports with Biqat KPI.',
  lang: 'am',
  dir: 'ltr',
  theme_color: '#0F172A',
  background_color: '#F8FAFC',
  display: 'standalone',
  display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
  orientation: 'any',
  start_url: '/',
  scope: '/',
  prefer_related_applications: false,
  launch_handler: {
    client_mode: ['navigate-existing', 'auto'],
  },
  categories: ['productivity', 'business', 'finance'],
  icons: [
    {
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-maskable-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  screenshots: [
    {
      src: '/pwa-screenshot-wide.png',
      sizes: '1280x720',
      type: 'image/png',
      form_factor: 'wide',
      label: 'Biqat KPI Executive Dashboard, Cascade Planner & Monthly Heatmap',
    },
    {
      src: '/pwa-screenshot-narrow.png',
      sizes: '720x1280',
      type: 'image/png',
      form_factor: 'narrow',
      label: 'Biqat KPI Mobile Offline Scorecard & Actuals Tracker',
    },
  ],
  shortcuts: [
    {
      name: 'KPI Dashboard',
      short_name: 'Overview',
      description: 'Open personal KPI executive dashboard, monthly heatmap, and daily pace',
      url: '/overview',
      icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
    },
    {
      name: 'Personal Assigned Plan',
      short_name: 'My Plan',
      description: 'Cascade annual, quarterly, and 12-month personal KPI targets',
      url: '/my-plan',
      icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
    },
    {
      name: 'Log Actual Performance',
      short_name: 'Actuals',
      description: 'Record monthly or daily KPI actuals offline against assigned plans',
      url: '/actuals',
      icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
    },
    {
      name: 'Appraisal Reports',
      short_name: 'Reports',
      description: 'View cumulative trends, YoY comparison, and PDF/CSV reports',
      url: '/reports',
      icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
    },
  ],
};

// Serves the Web App Manifest and a full multi-tier offline Service Worker over HTTP
// during `vite serve`, avoiding vite-plugin-pwa's dev-sw HMR script which calls
// `import.meta.hot.send()` synchronously before Vite 8's HMR WebSocket connects.
function pwaDevServerPlugin(): Plugin {
  const previewSwCode = `
const SW_VERSION = 'biqat-sw-v3.3';
const SHELL_CACHE = 'biqat-shell-v3.3';
const ASSET_CACHE = 'biqat-assets-v3.3';
const FONT_CACHE = 'biqat-fonts-v3.3';
const ACTIVE_CACHES = [SHELL_CACHE, ASSET_CACHE, FONT_CACHE];

const CORE_SHELL_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
  '/pwa-screenshot-wide.png',
  '/pwa-screenshot-narrow.png',
  '/og-social-card.png'
];

async function countAllCachedAssets() {
  const names = await caches.keys();
  let total = 0;
  for (const name of names) {
    if (name.startsWith('biqat-') || name.includes('workbox') || name.includes('fonts')) {
      const c = await caches.open(name);
      const keys = await c.keys();
      total += keys.length;
    }
  }
  return { total, cacheNames: names };
}

async function broadcastStatus() {
  const stats = await countAllCachedAssets();
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage({
      type: 'BIQAT_CACHE_STATUS',
      version: SW_VERSION,
      cachedCount: stats.total,
      cacheNames: stats.cacheNames
    });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        CORE_SHELL_URLS.map((url) =>
          fetch(url, { cache: 'reload' }).then((res) => {
            if (res && res.ok) return cache.put(url, res);
          })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const existing = await caches.keys();
      await Promise.all(
        existing
          .filter((name) => name.startsWith('biqat-') && !ACTIVE_CACHES.includes(name))
          .map((oldName) => caches.delete(oldName))
      );
      await self.clients.claim();
      await broadcastStatus();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never intercept Vite internal HMR socket/client scripts (allow /@vite-plugin-pwa/* to cache offline)
  if (
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/__vite') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 1. Google Fonts: Cache-First for guaranteed offline Amharic & Latin typography
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONT_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh && (fresh.ok || fresh.type === 'opaque')) {
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 2. SPA Route Navigations: Network-First with App Shell (/index.html -> /offline.html) Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            cache.put('/', fresh.clone());
            cache.put('/index.html', fresh.clone());
          }
          return fresh;
        } catch {
          return (
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            (await cache.match('/offline.html')) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // 3. Same-origin scripts, styles, icons & images: Network-First with Offline Cache Fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cachedAsset = await cache.match(req);
          if (cachedAsset) return cachedAsset;
          const shellMatch = await (await caches.open(SHELL_CACHE)).match(req);
          return shellMatch || Response.error();
        }
      })()
    );
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'GET_SW_STATUS') {
    event.waitUntil(broadcastStatus());
    return;
  }

  if (data.type === 'WARM_CACHE') {
    const extraUrls = Array.isArray(data.urls) ? data.urls : [];
    event.waitUntil(
      (async () => {
        const shellCache = await caches.open(SHELL_CACHE);
        const assetCache = await caches.open(ASSET_CACHE);
        const fontCache = await caches.open(FONT_CACHE);

        await Promise.allSettled(
          CORE_SHELL_URLS.map((u) =>
            fetch(u).then((r) => {
              if (r && r.ok) return shellCache.put(u, r);
            })
          )
        );

        await Promise.allSettled(
          extraUrls.slice(0, 60).map((u) =>
            fetch(u).then((r) => {
              if (!r || (!r.ok && r.type !== 'opaque')) return;
              if (u.includes('fonts.g')) return fontCache.put(u, r);
              return assetCache.put(u, r);
            })
          )
        );

        await broadcastStatus();
      })()
    );
    return;
  }

  if (data.type === 'CLEAR_SW_CACHES') {
    event.waitUntil(
      (async () => {
        const names = await caches.keys();
        await Promise.all(
          names.filter((n) => n.startsWith('biqat-')).map((n) => caches.delete(n))
        );
        const shellCache = await caches.open(SHELL_CACHE);
        await Promise.allSettled(
          CORE_SHELL_URLS.map((u) =>
            fetch(u, { cache: 'reload' }).then((r) => {
              if (r && r.ok) return shellCache.put(u, r);
            })
          )
        );
        await broadcastStatus();
      })()
    );
  }
});
`.trim();

  return {
    name: 'pwa-http-dev-server',
    apply: 'serve',
    transformIndexHtml(html) {
      const manifestTag = '<link rel="manifest" href="/manifest.webmanifest">';
      const swScript = `<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/preview-sw.js',{scope:'/'}).catch(()=>{});});}</script>`;
      return html.replace('</head>', `${manifestTag}${swScript}</head>`);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0];
        if (cleanUrl === '/manifest.webmanifest') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(JSON.stringify(pwaManifest, null, 2));
          return;
        }
        if (cleanUrl === '/preview-sw.js') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Service-Worker-Allowed', '/');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(previewSwCode);
          return;
        }
        next();
      });
    },
  };
}

function vercelSeoOriginPlugin(): Plugin {
  return {
    name: 'vercel-seo-origin',
    apply: 'build',
    transformIndexHtml(html) {
      const rawHost =
        process.env.VITE_SITE_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL;
      if (!rawHost) return html;
      const normalizedOrigin = rawHost
        .trim()
        .replace(/\/+$/, '')
        .replace(/^(?!https?:\/\/)/i, 'https://');
      return html.replaceAll(
        'https://ais-pre-2fgzc4gaatychnna2xeffj-30057240509.europe-west2.run.app',
        normalizedOrigin
      );
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      vercelSeoOriginPlugin(),
      pwaDevServerPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'apple-touch-icon.png',
          'icon.svg',
          'offline.html',
          'robots.txt',
          'og-social-card.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-192x192.png',
          'pwa-maskable-512x512.png',
          'pwa-screenshot-wide.png',
          'pwa-screenshot-narrow.png',
        ],
        manifest: pwaManifest as ManifestOptions,
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2,webmanifest}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'biqat-images-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          // Disabled in favour of pwaDevServerPlugin() above so Vite 8 never invokes
          // `/@vite-plugin-pwa/pwa-entry-point-loaded` before HMR socket connects.
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
