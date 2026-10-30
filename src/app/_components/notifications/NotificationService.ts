export interface NotificationPayload {
    title: string
    body: string
    icon?: string
    badge?: string
    image?: string
    tag?: string
    data?: any
    actions?: NotificationAction[],
    requireInteraction?: boolean
    silent?: boolean
}

export interface  NotificationAction {
    action: string
    title: string
    icon?: string
}

export class NotificationService {

    private registration: ServiceWorkerRegistration | null = null;

    async init(registration: ServiceWorkerRegistration): Promise<void> {
        this.registration = registration
    }

    async showNotification(payload: NotificationPayload): Promise<void> {
        if (!this.registration) {
            console.error('[PWA] Service Worker not registered')
            return;
        }

        const permission = await this.requestPermission()

        if (permission !== 'granted') {
            console.error('[PWA] Notification permissions not granted')
            return;
        }

        const options = {
            actions: payload.actions,
            badge: payload.badge,
            body: payload.body,
            data: payload.data,
            icon: payload.icon,
            requireInteraction: payload.requireInteraction,
            silent: payload.silent,
            tag: payload.tag
        }

        await this.registration.showNotification(payload.title, options)
    }

    isSupported(): boolean {
        return (
            'Notification' in window &&
            'serviceWorker' in navigator
        )
    }

    async requestPermission(): Promise<NotificationPermission>{
        if (!('Notification' in window)) {
            throw new Error('This browser does not support notifications')
        }
        let permission = Notification.permission

        if (permission === 'default') {
            permission = await Notification.requestPermission()
        }

        return permission
    }

    hasPermission(): boolean {
        return Notification.permission === 'granted'
    }

    isReady(): boolean {
        return this.registration !== null
    }
}

export const NotificationTemplates = {
    newAlarm: (
        eventData: any,
        labels: {title: string; body: string; viewAlarm: string; events: string; dismiss: string},
        viewKey?: string | null,
        nodeId?: string | null,
    ): NotificationPayload => {
        const eventId = typeof eventData?.occupancyObsId === 'string'
            ? eventData.occupancyObsId.trim()
            : '';
        const notificationIdentity = eventData?.id !== undefined && eventData?.id !== null
            ? `${nodeId ?? 'node'}-${eventData.id}`
            : 'unknown';

        return {
            title: labels.title,
            body: labels.body,
            icon: '/icons/icon-192x192.png',
            actions: [
                eventId
                    ? {action: 'view-alarm', title: labels.viewAlarm}
                    : {action: 'view-events', title: labels.events},
                {action: 'dismiss', title: labels.dismiss},
            ],
            badge: '/icons/icon-128x128.png',
            // The immediate fallback and its durable-ID replacement share a
            // tag, while simultaneous alarms retain independent notifications.
            tag: `alarm-notification-${notificationIdentity}`,
            data: eventData ? {
                // EventTableData.id is only a transient UI hash. The occupancy
                // observation ID is the durable Connected Systems resource ID.
                ...(eventId ? {eventId} : {}),
                ...(nodeId ? {nodeId} : {}),
                eventData: JSON.parse(JSON.stringify(eventData)),
                ...(viewKey ? {viewKey} : {}),
            } : undefined,
        };
    },
}
