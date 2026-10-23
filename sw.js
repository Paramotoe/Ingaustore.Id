/* Service worker: kerangka aplikasi tersedia saat offline.
   Naikkan VERSI setiap kali aset inti berubah. */

const VERSI = 'ingau-v1';
const KERANGKA = [
    '/',
    '/index.html',
    '/assets/css/tailwind.css',
    '/assets/css/style.css',
    '/assets/js/app.js',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',
    '/manifest.webmanifest'
];

/* Berkas yang tidak boleh di-cache: konfigurasi harus selalu segar. */
const SELALU_SEGAR = ['/assets/js/config.js'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VERSI)
            .then(cache => cache.addAll(KERANGKA))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== VERSI).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== location.origin) return;
    if (SELALU_SEGAR.includes(url.pathname)) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(res => {
                    const salinan = res.clone();
                    caches.open(VERSI).then(cache => cache.put('/index.html', salinan));
                    return res;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            const segar = fetch(request)
                .then(res => {
                    if (res && res.status === 200) {
                        const salinan = res.clone();
                        caches.open(VERSI).then(cache => cache.put(request, salinan));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || segar;
        })
    );
});
