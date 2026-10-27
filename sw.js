const CACHE_NAME = 'pill-v12';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Don't cache API calls
  if (e.request.url.includes('/.netlify/functions/')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Push event — this is what actually shows the notification on iOS ──
self.addEventListener('push', e => {
  let data = { title: '💊 תזכורת גלולה', body: 'הגיע הזמן לקחת את הגלולה!' };
  try {
    if (e.data) data = e.data.json();
  } catch (err) {
    console.error('Push parse error', err);
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'pill-reminder',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: '/' },
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click — open/focus the app ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
