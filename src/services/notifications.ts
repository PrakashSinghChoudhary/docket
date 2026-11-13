import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  AndroidNotificationPriority,
  AndroidNotificationVisibility,
} from 'expo-notifications';
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

const REMINDER_CHANNEL_ID = 'reminders-channel-v2';

/**
 * Configure Android notification channel with max priority and lockscreen visibility
 */
export async function initializeNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Docket Alerts & Timers',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#FFFFFF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
}

/**
 * Request notification permissions from user (supports Android 13+ POST_NOTIFICATIONS)
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
 * Schedule a single reminder notification
 */
export async function scheduleSingleReminderNotificationAsync({
  title,
  seconds,
  isCancelled,
}: {
  title: string;
  seconds: number;
  isCancelled?: () => boolean;
}): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (isCancelled && isCancelled()) return null;

    await initializeNotificationsAsync();
    if (isCancelled && isCancelled()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'Docket Reminder',
        body: 'Timer completed!',
        sound: 'default',
        priority: AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
        channelId: REMINDER_CHANNEL_ID,
      },
    });

    return id;
  } catch (err) {
    console.warn('Could not schedule single notification:', err);
    return null;
  }
}

/**
 * Schedule recurring reminder notifications in advance
 * Schedules future chimes so that background/locked devices
 * will alert at every recurring interval even if the app remains in the background.
 */
export async function scheduleRecurringNotificationsAsync({
  title,
  firstCycleRemainingSeconds,
  intervalSeconds,
  cyclesCount = 6,
  isCancelled,
}: {
  title: string;
  firstCycleRemainingSeconds: number;
  intervalSeconds: number;
  cyclesCount?: number;
  isCancelled?: () => boolean;
}): Promise<string[]> {
  const ids: string[] = [];
  try {
    if (Platform.OS === 'web') return ids;

    await initializeNotificationsAsync();

    for (let i = 0; i < cyclesCount; i++) {
      if (isCancelled && isCancelled()) {
        break;
      }
      const delaySeconds = Math.round(firstCycleRemainingSeconds + i * intervalSeconds);
      if (delaySeconds <= 0) continue;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: title || 'Docket Reminder',
          body: `Recurring interval completed!`,
          sound: 'default',
          priority: AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
          repeats: false,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
      if (id) {
        ids.push(id);
      }
    }
  } catch (err) {
    console.warn('Could not schedule recurring notifications:', err);
  }
  return ids;
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
 * Cancel multiple scheduled notifications
 */
export async function cancelMultipleNotificationsAsync(ids: string[]) {
  if (!ids || ids.length === 0) return;
  try {
    if (Platform.OS !== 'web') {
      await Promise.all(
        ids.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => { })
        )
      );
    }
  } catch (err) {
    console.warn('Error canceling multiple notifications:', err);
  }
}

/**
 * Dismiss all delivered notifications from the notification shade
 */
export async function dismissAllNotificationsAsync() {
  try {
    if (Platform.OS !== 'web') {
      await Notifications.dismissAllNotificationsAsync();
    }
  } catch (err) {
    console.warn('Error dismissing all notifications:', err);
  }
}

/**
 * Cancel all scheduled notifications and dismiss any delivered notifications.
 * Operates directly on the system AlarmManager and NotificationManager.
 */
export async function cancelAllNotificationsAsync() {
  try {
    if (Platform.OS !== 'web') {
      await Promise.all([
        Notifications.cancelAllScheduledNotificationsAsync().catch(() => {}),
        Notifications.dismissAllNotificationsAsync().catch(() => {}),
      ]);
    }
  } catch (err) {
    console.warn('Error canceling all notifications:', err);
  }
}
