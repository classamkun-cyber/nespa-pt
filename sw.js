const CACHE = 'nespaPT-v21.0';
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
    caches.match(e.request).then((r) => {
      if (r) return r;
      // V19.15：ここでキャッシュに無く、かつオフラインでfetch自体が失敗すると、
      // 受け皿が無いままrespondWith()が拒否されてERR_FAILEDの真っ白画面になっていた
      // （2026-08-21・リロードボタンをオフライン中に押した実機報告で発覚）。
      // 最後の砦としてindex.htmlのキャッシュを返し、オフラインでも必ず何かしら表示されるようにする。
      return fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});

// ---- V19：新着チャットのプッシュ通知（バックグラウンド受信）----
// アプリを閉じている／画面オフのときでも、Cloud Functionsから送られてきたpushをここで受け取って表示する。
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCzrEc7e9qGPH_2PogrZfFSH8H5Z035aV0",
  authDomain: "nespa-pt.firebaseapp.com",
  databaseURL: "https://nespa-pt-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nespa-pt",
  storageBucket: "nespa-pt.firebasestorage.app",
  messagingSenderId: "247771639596",
  appId: "1:247771639596:web:3b980f4ce44613ed6b0689"
});

try {
  const messaging = firebase.messaging();
  // Cloud Functions側は notification を含めず data だけを送ってくる（二重通知を防ぐため）。
  // なので payload.notification ではなく payload.data から組み立てる。
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || 'チャット';
    const body = data.body || '';
    const link = data.link || './';
    const icon = data.icon || './icon-192.png';
    self.registration.showNotification(title, {
      body,
      icon,
      badge: './icon-192.png',
      data: { url: link },
    });
  });
} catch (e) {
  // 対応してないブラウザ等ではここで静かに無視（キャッシュ機能自体は影響しない）
}

// 通知をタップしたら、開いているタブがあればそこにフォーカス、無ければ新しく開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
