const CACHE_NAME = 'radio-v1.0.2',
    ALLOWED_CACHE = [CACHE_NAME]

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll([
                    '/',
                    '/fontello.css',
                    '/fontello/css/animation.css',
                    '/fontello/css/fontello.css',
                    '/fontello/font/fontello.woff',
                    '/fontello/font/fontello.woff2',
                    '/fontello/font/fontello.ttf',
                    '/media/icon.png',
                    '/media/icon_192.png',
                    '/media/icon_256.png',
                    '/favicon.ico',
                    '/regulamin.html',
                    '/index.js',
                    '/index.css',
                ]);
            })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(caches.match(event.request).then(function (response) {
        // Cache hit - return response
        if (response) return response;

        return fetch(event.request).then(function (response) {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') return response

            if(response.url.includes('/socket.io/')) if(!response.url.includes('socket.io.js')) return
            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME).then(function (cache) {
                cache.put(event.request, responseToCache);
            });
        }
        );
    })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames.map(function (cacheName) {
                if (ALLOWED_CACHE.indexOf(cacheName) === -1) {
                    return caches.delete(cacheName);
                }
            })
        );
    })
    );
});