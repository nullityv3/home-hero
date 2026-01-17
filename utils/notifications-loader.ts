/**
 * Safe loader for expo-notifications to avoid bundling issues
 */

import { Platform } from 'react-native';

// Mock implementation for when expo-notifications is not available
const mockNotifications = {
  getPermissionsAsync: async () => {
    console.warn('expo-notifications not available. Using mock implementation.');
    return { status: 'undetermined' };
  },
  requestPermissionsAsync: async () => {
    console.warn('expo-notifications not available. Using mock implementation.');
    return { status: 'granted' };
  },
  scheduleNotificationAsync: async (request: any) => {
    console.warn('expo-notifications not available. Notification not sent.');
    return 'mock-notification-id';
  },
  cancelScheduledNotificationAsync: async (id: string) => {
    console.warn('expo-notifications not available. Cannot cancel notification.');
  },
  cancelAllScheduledNotificationsAsync: async () => {
    console.warn('expo-notifications not available. Cannot cancel notifications.');
  },
  getExpoPushTokenAsync: async () => {
    console.warn('expo-notifications not available. Using mock token.');
    return { data: 'mock-push-token' };
  },
  setNotificationHandler: (handler: any) => {
    console.warn('expo-notifications not available. Handler not set.');
  },
  addNotificationReceivedListener: (callback: any) => {
    console.warn('expo-notifications not available. Listener not added.');
    return { remove: () => {} };
  },
  addNotificationResponseReceivedListener: (callback: any) => {
    console.warn('expo-notifications not available. Listener not added.');
    return { remove: () => {} };
  },
};

let notificationsModule: any = null;
let isLoaded = false;

export async function loadNotifications() {
  if (isLoaded) {
    return notificationsModule;
  }

  // Always use mock on web
  if (Platform.OS === 'web') {
    notificationsModule = mockNotifications;
    isLoaded = true;
    return notificationsModule;
  }

  // Try to load on native platforms
  try {
    const ExpoNotifications = require('expo-notifications');
    
    // Configure notification behavior
    ExpoNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    notificationsModule = ExpoNotifications;
    isLoaded = true;
    return notificationsModule;
  } catch (error) {
    console.warn('expo-notifications not available, using mock implementation:', error.message);
    notificationsModule = mockNotifications;
    isLoaded = true;
    return notificationsModule;
  }
}