const CACHE_NAME = 'ig-scheduler-v1';
const ASSETS = [
    '/',
    '/index2.html',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', event => {
    // Basic cache-first strategy for the app shell
    if (event.request.method === 'GET' && !event.request.url.includes('api.anthropic.com') && !event.request.url.includes('api.imgbb.com') && !event.request.url.includes('graph.facebook.com')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});
