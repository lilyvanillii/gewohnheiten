// Offline-Cache: Seite immer frisch vom Netz (offline aus dem Speicher), übrige Dateien aus dem Speicher.
const CACHE = 'gewohnheiten-v9';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gewohnheiten-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.includes('/trinken/')) return; // eigene App mit eigenem Cache
  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isPage && url.origin === self.location.origin) {
    // Seite: immer zuerst die neueste Version holen (am Browser-Zwischenspeicher vorbei), offline die gespeicherte zeigen
    e.respondWith(caches.open(CACHE).then(c =>
      fetch(e.request, {cache: 'no-store'})
        .then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })
        .catch(async () => (await c.match(e.request, {ignoreSearch: true})) || (await c.match('index.html')))
    ));
    return;
  }
  // Icons, Schriften usw.: gespeicherte Version sofort, im Hintergrund aktualisieren
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
