import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { BackgroundTask } from '@capawesome/capacitor-background-task';

export interface AlertNotification {
    laneName: string;
    alarmState: string;
    timestamp?: Date;
    source?: string;
}

class NotificationService {
    private static instance: NotificationService;
    private isInitialized: boolean = false;
    private notificationId: number = 1;
    private isAppInBackground: boolean = false;

    private constructor() {}

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    async initialize(): Promise<boolean> {
        if (this.isInitialized) return true;

        // Only initialize on native platforms
        if (!Capacitor.isNativePlatform()) {
            console.log('NotificationService: Running in browser, using web notifications');
            this.isInitialized = true;
            return this.initializeWebNotifications();
        }

        try {
            // Request notification permissions
            const permStatus = await LocalNotifications.requestPermissions();

            if (permStatus.display !== 'granted') {
                console.warn('Notification permissions not granted');
                return false;
            }

            // Set up notification channel for Android
            await LocalNotifications.createChannel({
                id: 'oscar-alerts',
                name: 'OSCAR Alerts',
                description: 'Notifications for OSCAR alarm events',
                importance: 5, // Max importance
                visibility: 1, // Public
                sound: 'alarm_sound.wav',
                vibration: true,
                lights: true,
                lightColor: '#FF0000'
            });

            // Listen for app state changes
            App.addListener('appStateChange', ({ isActive }) => {
                this.isAppInBackground = !isActive;
                console.log(`App state changed: ${isActive ? 'foreground' : 'background'}`);

                if (!isActive) {
                    this.startBackgroundTask();
                }
            });

            // Handle notification actions
            LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
                console.log('Notification action performed:', notification);
                // Handle notification tap - could navigate to specific lane/event
            });

            this.isInitialized = true;
            console.log('NotificationService initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize NotificationService:', error);
            return false;
        }
    }

    private async initializeWebNotifications(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('Web notifications not supported');
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    private async startBackgroundTask(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const taskId = await BackgroundTask.beforeExit(async () => {
                console.log('Background task started - MQTT connections maintained');

                // The MQTT connections in the main app will continue running
                // This task keeps the app alive for a short period
                // For longer background operation, you may need a foreground service

                // Finish the background task after some time
                // Note: On Android, background tasks have limited time (~30 seconds)
                setTimeout(() => {
                    BackgroundTask.finish({ taskId });
                }, 25000);
            });
        } catch (error) {
            console.error('Failed to start background task:', error);
        }
    }

    async showAlertNotification(alert: AlertNotification): Promise<void> {
        const title = this.getNotificationTitle(alert.alarmState);
        const body = this.getNotificationBody(alert);

        if (!Capacitor.isNativePlatform()) {
            // Web notification
            this.showWebNotification(title, body, alert);
            return;
        }

        try {
            const options: ScheduleOptions = {
                notifications: [{
                    id: this.notificationId++,
                    title: title,
                    body: body,
                    channelId: 'oscar-alerts',
                    smallIcon: 'ic_notification',
                    largeIcon: 'ic_launcher',
                    sound: 'alarm_sound.wav',
                    ongoing: false,
                    autoCancel: true,
                    extra: {
                        laneName: alert.laneName,
                        alarmState: alert.alarmState,
                        timestamp: alert.timestamp?.toISOString() || new Date().toISOString()
                    },
                    actionTypeId: 'OSCAR_ALERT'
                }]
            };

            await LocalNotifications.schedule(options);
            console.log(`Notification shown: ${title} - ${body}`);
        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }

    private showWebNotification(title: string, body: string, alert: AlertNotification): void {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-128x128.png',
                tag: `oscar-alert-${alert.laneName}-${Date.now()}`,
                requireInteraction: true,
                vibrate: [200, 100, 200]
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    private getNotificationTitle(alarmState: string): string {
        switch (alarmState.toLowerCase()) {
            case 'alarm':
                return '🚨 OSCAR Alarm Detected';
            case 'fault':
                return '⚠️ OSCAR Fault Detected';
            case 'tamper':
                return '🔒 OSCAR Tamper Alert';
            case 'background':
                return '✅ OSCAR Status Normal';
            default:
                return 'OSCAR Alert';
        }
    }

    private getNotificationBody(alert: AlertNotification): string {
        const time = alert.timestamp
            ? alert.timestamp.toLocaleTimeString()
            : new Date().toLocaleTimeString();

        return `${alert.laneName}: ${alert.alarmState} at ${time}`;
    }

    // Check if app is in background
    isInBackground(): boolean {
        return this.isAppInBackground;
    }

    // Method to be called from MQTT handlers
    async handleAlarmStateChange(
        laneName: string,
        alarmState: string,
        source?: string
    ): Promise<void> {
        // Only show notifications for actual alerts (not normal "Background" state)
        const alertStates = ['alarm', 'fault', 'tamper'];

        if (alertStates.includes(alarmState.toLowerCase())) {
            await this.showAlertNotification({
                laneName,
                alarmState,
                timestamp: new Date(),
                source
            });
        }
    }
}

export const notificationService = NotificationService.getInstance();
export default NotificationService;
