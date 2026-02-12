import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gov.ornl.oscar.viewer',
  appName: 'OSCAR Viewer',
  webDir: 'web',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#FF0000',
      sound: 'alarm_sound.wav'
    },
    BackgroundTask: {
      // Enable background task handling
    },
    App: {
      // Enable app state change detection
    }
  },
  android: {
    allowMixedContent: true, // Allow HTTP connections on local network
    backgroundColor: '#ffffff'
  },
  server: {
    // For local network development
    cleartext: true,
    allowNavigation: ['*']
  }
};

export default config;
