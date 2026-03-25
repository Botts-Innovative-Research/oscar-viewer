/*
 * Copyright (c) 2024. Botts Innovative Research, Inc.
 * All Rights Reserved
 */

const CACHE_NAME = 'oscar-v1';
const OFFLINE_URL = '/offline.html';

const DENY_LIST = [
    '/sensorhub/sos',
    '/sensorhub/sps',
    '/api/auth',
    '/setup'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                OFFLINE_URL,
                '/favicon.ico',
                '/opensensorhub.png'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Security: Never cache sensitive telemetry or auth routes
    if (DENY_LIST.some(path => url.pathname.startsWith(path))) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    // Use the push payload for localization if available; otherwise fallback to the server-sent strings.
    const title = data.title;
    const options = {
        body: data.body,
        icon: '/opensensorhub.png',
        badge: '/favicon.ico',
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
