self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const title = data.title || 'New OSCAR Notification';
        const options = {
            body: data.body || 'You have a new notification',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: data.badge || '/icons/icon-128x128.png',
            vibrate: [200, 100, 200],
            data: {
                url: data.url,
                timestamp: new Date().toISOString(),
                source: '',
                ...data
            },
            requireInteraction: true,
            tag: `pwa-notification-${Date.now()}`,
            actions: [
                {
                    action: 'view-alarm',
                    title: 'View Alarm'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const notificationData = event.notification.data;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    if (event.action === 'view-alarm' && notificationData) {
                        client.postMessage({
                            type: 'VIEW_ALARM',
                            eventData: notificationData.eventData,
                            eventId: notificationData.eventId
                        });
                    }
                    return;
                }
            }
            if (clients.openWindow) {
                const url = (event.action === 'view-alarm' && notificationData?.eventId)
                    ? `/event-details?eventId=${notificationData.eventId}`
                    : '/';
                return clients.openWindow(url);
            }
        })
    );
});