// Service worker: guarda la app para que abra sin conexión.
// Solo toca la caché de archivos. Los datos del usuario viven en IndexedDB y aquí no se tocan nunca.
const VERSION = '1.0.0';                       // igual que js/version.js
const CACHE = 'gym-' + VERSION;
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'vendor/fonts/anton.woff2', 'vendor/fonts/inter-tight.woff2', 'icons/icon-192.png', 'icons/icon-180.png',
  'js/app.js', 'js/nav.js', 'js/state.js', 'js/db.js', 'js/logic.js', 'js/timer.js', 'js/backup.js', 'js/sheets.js', 'js/config.js', 'js/version.js', 'js/man.js',
  'js/data/exercises.js', 'js/data/routines.js', 'js/data/labels.js', 'js/data/moves.js',
  ...['kit', 'ver', 'hoy', 'sesion', 'ejercicio', 'pasos', 'cardio', 'fin', 'rutina', 'elegir', 'ficha', 'progreso', 'tu', 'partida', 'hoja'].map(n => `js/ui/${n}.js`)];
const LATER = ['vendor/three.module.js'];      // pesa 1,3 MB: se guarda después, sin frenar la instalación

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(async c => { await c.addAll(CORE); c.addAll(LATER).catch(() => {}); })));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('gym-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Primero la caché; si no está, la red (y se guarda). Las llamadas a Google no pasan por aquí.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), hit = await cache.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { const res = await fetch(e.request); if (res.ok) cache.put(e.request, res.clone()); return res; }
    catch { return (await cache.match('index.html')) || Response.error(); }
  })());
});
