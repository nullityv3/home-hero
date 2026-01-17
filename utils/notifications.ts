/**
 * Notification utilities for handling push notifications and preferences
 * 
 * Note: This module requires expo-notifications to be installed.
 * Install with: npx expo install expo-notifications
 */

import { NotificationSettings } from '@/types';
import { Alert, Platform } from 'react-native';
import { loadNotifications } from './notifications-loader';

// Type definitions for when expo-notifications is available
type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

interface PermissionResponse {
  status: NotificationPermissionStatus;
}

/**
 * Request notification permissions from the user
 * @returns Promise with permission status
 */
export async function requestNotificationPermissions(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  try {
    const notifications = await loadNotifications();
    const { status: existingStatus } = await notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Only ask if permissions have not already been determined
    if (existingStatus !== 'granted') {
      const { status } = await notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Check if we can ask again if permission was denied
    const canAskAgain = existingStatus === 'undetermined';

    return {
      granted: finalStatus === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return {
      granted: false,
      canAskAgain: false,
    };
  }
}

/**
 * Check current notification permission status
 * @returns Promise with permission status
 */
export async function checkNotificationPermissions(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  try {
    const notifications = await loadNotifications();
    const { status } = await notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain: status === 'undetermined',
    };
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return {
      granted: false,
      canAskAgain: false,
    };
  }
}

/**
 * Show an alert to guide user to settings if permissions were denied
 */
export function showPermissionDeniedAlert(): void {
  Alert.alert(
    'Notifications Disabled',
    'To receive notifications, please enable them in your device settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          if (Platform.OS === 'ios') {
            // On iOS, we can't directly open settings, but we can guide the user
            Alert.alert(
              'Enable Notifications',
              'Go to Settings > HomeHeroes > Notifications and enable notifications.'
            );
          } else {
            // On Android, we could potentially open app settings
            Alert.alert(
              'Enable Notifications',
              'Go to Settings > Apps > HomeHeroes > Notifications and enable notifications.'
            );
          }
        },
      },
    ]
  );
}

/**
 * Determine if a notification should be sent based on user preferences
 * @param preferences User's notification preferences
 * @param notificationType Type of notification to send
 * @returns Whether the notification should be sent
 */
export function shouldSendNotification(
  preferences: NotificationSettings,
  notificationType: keyof NotificationSettings
): boolean {
  // Check if the specific notification type is enabled
  return preferences[notificationType] === true;
}

/**
 * Send a local notification if preferences allow
 * @param title Notification title
 * @param body Notification body
 * @param data Additional data to include
 * @param preferences User's notification preferences
 * @param notificationType Type of notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data: Record<string, any>,
  preferences: NotificationSettings,
  notificationType: keyof NotificationSettings
): Promise<void> {
  try {
    // Check if user has enabled this type of notification
    if (!shouldSendNotification(preferences, notificationType)) {
      console.log(`Notification type ${notificationType} is disabled by user preferences`);
      return;
    }

    // Check if we have permission to send notifications
    const { granted } = await checkNotificationPermissions();
    if (!granted) {
      console.log('Notification permissions not granted');
      return;
    }

    // Send the notification
    const notifications = await loadNotifications();
    await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: preferences.push_notifications ? true : false,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
}

/**
 * Schedule a notification for a future time
 * @param title Notification title
 * @param body Notification body
 * @param data Additional data
 * @param triggerDate When to send the notification
 * @param preferences User's notification preferences
 * @param notificationType Type of notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  data: Record<string, any>,
  triggerDate: Date,
  preferences: NotificationSettings,
  notificationType: keyof NotificationSettings
): Promise<string | null> {
  try {
    // Check if user has enabled this type of notification
    if (!shouldSendNotification(preferences, notificationType)) {
      console.log(`Notification type ${notificationType} is disabled by user preferences`);
      return null;
    }

    // Check if we have permission to send notifications
    const { granted } = await checkNotificationPermissions();
    if (!granted) {
      console.log('Notification permissions not granted');
      return null;
    }

    // Schedule the notification
    const notifications = await loadNotifications();
    const notificationId = await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: preferences.push_notifications ? true : false,
      },
      trigger: triggerDate,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 * @param notificationId ID of the notification to cancel
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    const notifications = await loadNotifications();
    await notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    const notifications = await loadNotifications();
    await notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Get the push notification token for remote notifications
 * @returns Push token or null if unavailable
 */
export async function getPushToken(): Promise<string | null> {
  try {
    const { granted } = await checkNotificationPermissions();
    if (!granted) {
      return null;
    }

    const notifications = await loadNotifications();
    const token = await notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Handle notification received while app is in foreground
 * @param callback Function to call when notification is received
 */
export async function addNotificationReceivedListener(
  callback: (notification: any) => void
): Promise<any> {
  const notifications = await loadNotifications();
  return notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification response (user tapped on notification)
 * @param callback Function to call when user interacts with notification
 */
export async function addNotificationResponseListener(
  callback: (response: any) => void
): Promise<any> {
  const notifications = await loadNotifications();
  return notifications.addNotificationResponseReceivedListener(callback);
}