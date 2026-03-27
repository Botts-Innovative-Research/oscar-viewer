/*
 * Copyright (c) 2024. Botts Innovative Research, Inc.
 * All Rights Reserved
 */

export class NotificationService {
    static async requestPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notifications');
            return 'denied';
        }

        if (Notification.permission === 'granted') {
            return 'granted';
        }

        return await Notification.requestPermission();
    }

    static async showNotification(title: string, options?: NotificationOptions) {
        if (Notification.permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification(title, options);
        }
    }
}
