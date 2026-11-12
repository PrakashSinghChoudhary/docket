import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

// Set default notification behavior for in-app reception
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const REMINDER_CHANNEL_ID = 'reminders-channel';

/**
 * Configure Android notification channels
 */
export async function initializeNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Docket Alerts & Timers',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFFFFF',
      sound: 'default',
    });
  }
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermissionAsync(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
    }
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Schedule a reminder notification
 */
export async function scheduleReminderNotificationAsync({
  title,
  body,
  seconds,
  repeats,
}: {
  title: string;
  body: string;
  seconds: number;
  repeats: boolean;
}): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return null;
    }

    await initializeNotificationsAsync();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, seconds),
        repeats,
        channelId: REMINDER_CHANNEL_ID,
      },
    });

    return id;
  } catch (err) {
    console.warn('Could not schedule notification:', err);
    return null;
  }
}

/**
 * Cancel a specific scheduled notification
 */
export async function cancelNotificationAsync(id: string | null) {
  if (!id) return;
  try {
    if (Platform.OS !== 'web') {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch (err) {
    console.warn('Error canceling notification:', err);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotificationsAsync() {
  try {
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch (err) {
    console.warn('Error canceling all notifications:', err);
  }
}
