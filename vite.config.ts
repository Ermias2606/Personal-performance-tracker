import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const pwaManifest = {
  id: '/',
  name: 'Biqat KPI — Personal & Branch Performance Tracker',
  short_name: 'Biqat KPI',
  description:
    'Offline-first personal KPI performance tracker for setting branch annual plans, cascading annual, quarterly, and monthly personal targets, logging actual performance, and generating analytical reports.',
  theme_color: '#0F172A',
  background_color: '#F8FAFC',
  display: 'standalone' as const,
  orientation: 'any' as const,
  start_url: '/',
  scope: '/',
  categories: ['productivity', 'business', 'finance'],
  icons: [
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
      src: '/pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  shortcuts: [
    {
      name: 'KPI Dashboard',
      short_name: 'Overview',
      description: 'Open personal KPI executive dashboard and daily pace',
      url: '/overview',
      icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
    },
    {
      name: 'Log Actual Performance',
      short_name: 'Actuals',
      description: 'Record monthly or daily KPI actuals offline',
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

// Serves the Web App Manifest and a lightweight preview Service Worker directly over HTTP
// during `vite serve`, avoiding vite-plugin-pwa's dev-sw HMR script which calls
// `import.meta.hot.send()` synchronously before Vite 8's HMR WebSocket connects
// (causing `SendBeforeConnectError: send was called before connect`).
function pwaDevServerPlugin(): Plugin {
  const previewSwCode = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
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
          res.setHeader('Content-Type', 'application/manifest+json');
          res.end(JSON.stringify(pwaManifest, null, 2));
          return;
        }
        if (cleanUrl === '/preview-sw.js') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript');
          res.end(previewSwCode);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      pwaDevServerPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'apple-touch-icon.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: pwaManifest,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
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
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          // Disabled in favour of pwaDevServerPlugin() above because vite-plugin-pwa's
          // `/@vite-plugin-pwa/pwa-entry-point-loaded` calls `import.meta.hot.send()`
          // synchronously on load, throwing `SendBeforeConnectError` in Vite 8.
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
