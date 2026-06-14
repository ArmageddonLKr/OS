const CACHE = 'orbit-v23';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './css/modules.css',
  './js/app.js',
  './js/store.js',
  './js/ai.js',
  './js/ui.js',
  './js/tools.js',
  './js/study.js',
  './js/faith.js',
  './js/finance.js',
  './js/habits.js',
  './js/vault.js',
  './js/entertainment.js',
  './js/agenda.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './fonts/SpaceGrotesk-Variable.woff2',
  './fonts/JetBrainsMono-Variable.woff2',
  './fonts/Inter-Regular.woff2',
  './fonts/Inter-Medium.woff2',
  './fonts/Inter-Bold.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // API Gemini: nunca intercepta
  if (url.includes('googleapis.com') || url.includes('generativelanguage')) return;

  // index.html: network-first — novos deploys chegam imediatamente
  if (url.endsWith('/') || url.includes('index.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./'))
    );
    return;
  }

  // Icones, manifest, sw.js: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./'));
    })
  );
});
