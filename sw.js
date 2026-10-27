// Check It service worker: offline cache + notifications.
const CACHE = 'checkit-v4';
const ASSETS = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/app.js', './js/store.js', './js/auth.js', './js/schedule.js', './js/icons.js',
  './js/notify.js', './js/intro.js', './js/views.js', './js/ui.js', './js/landing.js', './js/router.js', './js/shell.js', './js/notes.js', './js/channels.js', './js/palette.js', './js/export.js', './js/fx.js',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
];

let pending = { count: 0, names: [] };

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first for our own files, cache fallback (works offline).
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'pending') pending = { count: e.data.count, names: e.data.names || [] };
});

self.addEventListener('periodicsync', (e) => {
  if (e.tag !== 'checkit-reminder' || !pending.count) return;
  e.waitUntil(self.registration.showNotification(`You have ${pending.count} unfinished tasks`, {
    body: pending.names.slice(0, 3).join(', '), tag: 'checkit-periodic', icon: 'assets/icon-192.png',
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./#/today');
    }),
  );
});
