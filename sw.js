const CACHE = 'orbit-v27';
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

  // APIs de IA e dados externos: nunca intercepta
  if (
    url.includes('googleapis.com') ||
    url.includes('generativelanguage') ||
    url.includes('groq.com') ||
    url.includes('api.open-meteo.com') ||
    url.includes('awesomeapi.com.br') ||
    url.includes('jina.ai') ||
    url.includes('duckduckgo.com') ||
    url.includes('espn.com') ||
    url.includes('jolpi.ca')
  ) return;

  // index.html: network-first — novos deploys chegam imediatamente
  if (url.endsWith('/') || url.includes('index.html')) {
    e.respondWith(
      fetch(e.request, { signal: AbortSignal.timeout(4000) }).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Fontes: cache-first (imutáveis)
  if (url.includes('/fonts/')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // CSS e JS: stale-while-revalidate — resposta instantânea + atualiza em background
  if (url.includes('/css/') || url.includes('/js/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Demais assets: cache-first com fallback de rede
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

/* ── PUSH NOTIFICATIONS ── */
self.addEventListener('push', e => {
  let data = { title: 'OS', body: 'Você tem uma notificação.', icon: './icon-192.png' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch (_) {
    if (e.data) data.body = e.data.text();
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'orbit-notif',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const existing = cls.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

/* ── MENSAGENS DO CLIENTE (agendamento de notificações locais) ── */
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'NOTIFY') {
    const { title, body, tag, delay } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title || 'OS', {
        body: body || '',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: tag || 'orbit-local',
        vibrate: [100, 50, 100],
        silent: false
      });
    }, delay || 0);
  }
});
