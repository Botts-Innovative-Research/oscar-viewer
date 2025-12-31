

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

        const options: NotificationOptions = {
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
    newAlarm: (laneName: string): NotificationPayload => ({
        title: 'New Alarm',
        body: `${laneName} with new alarm`,
        icon: '/icons/icon-192x192.png',
        actions: [
            { action: 'view-alarm', title: 'View Alarm' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
        badge: '/icons/icon-128x128.png',
        tag: 'alarm-notification',
    }),
}