const CACHE = 'nespaPT-v17.0';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.png', './icon-192.png', './icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 同一オリジンのGETだけキャッシュ対象。Firebase等の外部通信はそのままネットワークへ。
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
