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
    const shouldViewAlarm = event.action !== 'view-events' && Boolean(notificationData?.eventId);
    const destination = shouldViewAlarm
        ? `/event-details?eventId=${encodeURIComponent(notificationData.eventId)}`
        : '/event-log';
    const destinationUrl = new URL(destination, self.location.origin);
    if (shouldViewAlarm && notificationData?.nodeId)
        destinationUrl.searchParams.set('nodeId', notificationData.nodeId);
    if (notificationData?.viewKey)
        destinationUrl.searchParams.set('view', notificationData.viewKey);
    const viewerPaths = new Set([
        '/', '/alarm-transfer', '/event-details', '/event-log', '/event-preview',
        '/health', '/lane-view', '/map', '/national-view', '/quick-view',
        '/report', '/servers'
    ]);

    event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true}).then(async (clientList) => {
            const expectedView = notificationData?.viewKey ?? null;
            for (const client of clientList) {
                const clientUrl = new URL(client.url);
                const clientView = clientUrl.searchParams.get('view');
                const normalizedPath = clientUrl.pathname.replace(/\/+$/, '') || '/';
                if (clientUrl.origin === self.location.origin
                    && clientView === expectedView
                    && viewerPaths.has(normalizedPath)
                    && 'focus' in client) {
                    if ('navigate' in client) {
                        try {
                            const navigatedClient = await client.navigate(destinationUrl.toString());
                            await (navigatedClient ?? client).focus();
                            return;
                        } catch (error) {
                            // Fall through to the message path for browsers that
                            // expose WindowClient.navigate but cannot complete it.
                        }
                    }
                    await client.focus();
                    client.postMessage(shouldViewAlarm ? {
                        type: 'VIEW_ALARM',
                        eventData: notificationData.eventData,
                        eventId: notificationData.eventId,
                        nodeId: notificationData.nodeId
                    } : {type: 'VIEW_EVENTS'});
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(destinationUrl.toString());
            }
        })
    );
});
