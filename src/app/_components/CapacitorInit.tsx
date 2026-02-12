"use client";

import { useEffect, useState } from 'react';
import { notificationService } from '@/services/NotificationService';

export default function CapacitorInit({ children }: { children: React.ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initCapacitor = async () => {
            try {
                // Initialize notification service
                const success = await notificationService.initialize();
                if (success) {
                    console.log('Capacitor notification service initialized');
                }
                setIsInitialized(true);
            } catch (error) {
                console.error('Failed to initialize Capacitor services:', error);
                setIsInitialized(true); // Continue anyway
            }
        };

        initCapacitor();
    }, []);

    return <>{children}</>;
}
