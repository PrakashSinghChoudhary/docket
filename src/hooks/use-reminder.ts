import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playBeepSound, SoundType } from '@/services/sound';
import {
  cancelMultipleNotificationsAsync,
  requestNotificationPermissionAsync,
  scheduleRecurringNotificationsAsync,
  scheduleSingleReminderNotificationAsync,
} from '@/services/notifications';

const STORAGE_KEY = '@reminder_active_state_v2';
const HISTORY_KEY = '@reminder_history_v1';

export interface ReminderHistoryItem {
  id: string;
  timestamp: number;
  formattedTime: string;
  cycleNumber: number;
  title: string;
}

export interface ReminderConfig {
  id: string;
  title: string;
  durationMinutes: number;
  durationSeconds: number;
  totalSeconds: number;
  recurring: boolean;
  soundType: SoundType;
  startedAt: number;
}

export interface ReminderState {
  config: ReminderConfig | null;
  isActive: boolean;
  isPaused: boolean;
  secondsRemaining: number;
  triggerCount: number;
  lastTriggeredAt: number | null;
  scheduledNotificationIds: string[];
  nextChimeTimestamp: number | null;
  cycleStartedAt: number | null;
  pausedRemainingSeconds: number | null;
}

const DEFAULT_STATE: ReminderState = {
  config: null,
  isActive: false,
  isPaused: false,
  secondsRemaining: 0,
  triggerCount: 0,
  lastTriggeredAt: null,
  scheduledNotificationIds: [],
  nextChimeTimestamp: null,
  cycleStartedAt: null,
  pausedRemainingSeconds: null,
};

export function formatSecondsToDisplay(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function useReminder() {
  const [state, setState] = useState<ReminderState>(DEFAULT_STATE);
  const [history, setHistory] = useState<ReminderHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep stateRef fresh for callbacks
  const stateRef = useRef<ReminderState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Reschedule background notifications for active state
   */
  const scheduleNotificationsForState = useCallback(
    async (
      config: ReminderConfig,
      remainingSec: number
    ): Promise<string[]> => {
      // Cancel previous scheduled notifications first
      const oldIds = stateRef.current.scheduledNotificationIds;
      if (oldIds && oldIds.length > 0) {
        await cancelMultipleNotificationsAsync(oldIds);
      }

      await requestNotificationPermissionAsync();

      if (config.recurring) {
        return await scheduleRecurringNotificationsAsync({
          title: config.title,
          firstCycleRemainingSeconds: remainingSec,
          intervalSeconds: config.totalSeconds,
          cyclesCount: 8,
        });
      } else {
        const id = await scheduleSingleReminderNotificationAsync({
          title: config.title,
          seconds: remainingSec,
        });
        return id ? [id] : [];
      }
    },
    []
  );

  /**
   * Reconcile current state with real wall-clock time
   * This handles background resumption, screen-off catchup, and regular ticks.
   */
  const syncWithWallClock = useCallback(async () => {
    const current = stateRef.current;
    if (!current.isActive || current.isPaused || !current.config || !current.nextChimeTimestamp) {
      return;
    }

    const now = Date.now();
    const config = current.config;
    const totalSec = config.totalSeconds;
    const totalMs = totalSec * 1000;

    // Case 1: Still within the current cycle
    if (now < current.nextChimeTimestamp) {
      const remainingMs = current.nextChimeTimestamp - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      if (remainingSec !== current.secondsRemaining) {
        setState((prev) => ({
          ...prev,
          secondsRemaining: remainingSec,
        }));
      }
      return;
    }

    // Case 2: One or more cycles completed (either just now or while screen was off)
    const cycleStart = current.cycleStartedAt || current.nextChimeTimestamp - totalMs;
    const elapsedSinceStart = now - cycleStart;
    const cyclesCompleted = Math.max(1, Math.floor(elapsedSinceStart / totalMs));

    // Sound alert
    playBeepSound(config.soundType || 'chime').catch(() => { });

    // Generate history items for completed cycle(s)
    const newHistoryItems: ReminderHistoryItem[] = [];
    for (let c = 1; c <= Math.min(cyclesCompleted, 5); c++) {
      const cycleTime = cycleStart + c * totalMs;
      const cycleNum = current.triggerCount + c;
      newHistoryItems.push({
        id: `${cycleTime}-${cycleNum}`,
        timestamp: cycleTime,
        formattedTime: formatTimeOfDay(new Date(cycleTime)),
        cycleNumber: cycleNum,
        title: config.title,
      });
    }

    setHistory((prev) => [...newHistoryItems.reverse(), ...prev.slice(0, 45)]);

    if (config.recurring) {
      // Calculate ongoing cycle parameters
      const newCycleStartedAt = cycleStart + cyclesCompleted * totalMs;
      const newNextChimeTimestamp = newCycleStartedAt + totalMs;
      const remainingSec = Math.max(1, Math.ceil((newNextChimeTimestamp - now) / 1000));

      // Refresh background notifications for upcoming cycles
      scheduleNotificationsForState(config, remainingSec).then((newIds) => {
        setState((prev) => ({
          ...prev,
          scheduledNotificationIds: newIds,
        }));
      });

      setState((prev) => ({
        ...prev,
        triggerCount: prev.triggerCount + cyclesCompleted,
        lastTriggeredAt: now,
        cycleStartedAt: newCycleStartedAt,
        nextChimeTimestamp: newNextChimeTimestamp,
        secondsRemaining: remainingSec,
      }));
    } else {
      // One-shot timer completed
      if (current.scheduledNotificationIds.length > 0) {
        cancelMultipleNotificationsAsync(current.scheduledNotificationIds);
      }

      setState((prev) => ({
        ...prev,
        isActive: false,
        triggerCount: prev.triggerCount + 1,
        lastTriggeredAt: now,
        nextChimeTimestamp: null,
        cycleStartedAt: null,
        secondsRemaining: 0,
        scheduledNotificationIds: [],
      }));
    }
  }, [scheduleNotificationsForState]);

  // Load saved state on mount and reconcile with real time
  useEffect(() => {
    async function loadStoredState() {
      try {
        const [savedStateJson, savedHistoryJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
        ]);

        if (savedHistoryJson) {
          try {
            setHistory(JSON.parse(savedHistoryJson));
          } catch {
            // Ignore corrupted history
          }
        }

        if (savedStateJson) {
          const parsed: ReminderState = JSON.parse(savedStateJson);
          if (parsed.isActive && parsed.config) {
            const now = Date.now();
            const totalSec = parsed.config.totalSeconds;
            const totalMs = totalSec * 1000;

            if (parsed.isPaused) {
              setState(parsed);
              } else if (parsed.nextChimeTimestamp) {
                if (now < parsed.nextChimeTimestamp) {
                  const rem = Math.max(1, Math.ceil((parsed.nextChimeTimestamp - now) / 1000));
                  setState({
                    ...parsed,
                    secondsRemaining: rem,
                  });
                } else {
                    // Completed while closed
                    const cycleStart = parsed.cycleStartedAt || parsed.nextChimeTimestamp - totalMs;
                    const elapsed = now - cycleStart;
                    const cycles = Math.max(1, Math.floor(elapsed / totalMs));

                    if (parsed.config.recurring) {
                      const newCycleStart = cycleStart + cycles * totalMs;
                      const newNextChime = newCycleStart + totalMs;
                      const rem = Math.max(1, Math.ceil((newNextChime - now) / 1000));

                      setState({
                        ...parsed,
                        triggerCount: parsed.triggerCount + cycles,
                        cycleStartedAt: newCycleStart,
                        nextChimeTimestamp: newNextChime,
                        secondsRemaining: rem,
                      });
                    } else {
                      setState({
                        ...parsed,
                        isActive: false,
                        secondsRemaining: 0,
                        nextChimeTimestamp: null,
                      });
                    }
                  }
                }
              } else {
                setState(parsed);
              }
            }
          } catch (err) {
            console.warn('Failed to restore reminder state:', err);
          } finally {
            setIsLoaded(true);
          }
        }

        loadStoredState();
      }, []);

  // Listen to AppState changes (Sync timer the moment screen turns on / app enters foreground)
  useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      syncWithWallClock();
    }
  });

      return() => {
    subscription.remove();
  };
}, [syncWithWallClock]);

// Foreground tick interval (runs every 500ms to keep display accurate without drift)
useEffect(() => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  if (state.isActive && !state.isPaused) {
    timerRef.current = setInterval(() => {
    syncWithWallClock();
  }, 500);
    }

return () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};
  }, [state.isActive, state.isPaused, syncWithWallClock]);

// Persist state changes
useEffect(() => {
  if (!isLoaded) return;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => { });
}, [state, isLoaded]);

// Persist history changes
useEffect(() => {
  if (!isLoaded) return;
  AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => { });
}, [history, isLoaded]);

/**
 * Start a new reminder
 */
const startReminder = useCallback(
  async ({
    title = 'Reminder',
    durationMinutes = 20,
    durationSeconds = 0,
    recurring = true,
    soundType = 'chime',
  }: {
    title?: string;
    durationMinutes?: number;
    durationSeconds?: number;
    recurring?: boolean;
    soundType?: SoundType;
  }) => {
    const totalSeconds = Math.max(1, durationMinutes * 60 + durationSeconds);
    const now = Date.now();
    const nextChime = now + totalSeconds * 1000;

    const config: ReminderConfig = {
      id: `rem_${now}`,
      title: title || 'Docket Reminder',
      durationMinutes,
      durationSeconds,
      totalSeconds,
      recurring,
      soundType,
      startedAt: now,
    };

    const notificationIds = await scheduleNotificationsForState(config, totalSeconds);

    setState({
      config,
      isActive: true,
      isPaused: false,
      secondsRemaining: totalSeconds,
      triggerCount: 0,
      lastTriggeredAt: null,
      scheduledNotificationIds: notificationIds,
      nextChimeTimestamp: nextChime,
      cycleStartedAt: now,
      pausedRemainingSeconds: null,
    });
  },
  [scheduleNotificationsForState]
);

/**
 * Stop reminder completely
 */
const stopReminder = useCallback(async () => {
    const ids = stateRef.current.scheduledNotificationIds;
    if (ids && ids.length > 0) {
      await cancelMultipleNotificationsAsync(ids);
    }

    setState((prev) => ({
      ...DEFAULT_STATE,
      config: prev.config ? { ...prev.config } : null,
    }));
  }, []);

/**
 * Pause the active countdown
 */
const pauseReminder = useCallback(async () => {
    const current = stateRef.current;
    if (!current.isActive || current.isPaused) return;

    // Cancel pending background notifications while paused
    if (current.scheduledNotificationIds.length > 0) {
      await cancelMultipleNotificationsAsync(current.scheduledNotificationIds);
    }

    const now = Date.now();
    const remainingSec = current.nextChimeTimestamp
      ? Math.max(0, Math.ceil((current.nextChimeTimestamp - now) / 1000))
      : current.secondsRemaining;

    setState((prev) => ({
      ...prev,
      isPaused: true,
      secondsRemaining: remainingSec,
      pausedRemainingSeconds: remainingSec,
      scheduledNotificationIds: [],
    }));
  }, []);

/**
 * Resume paused countdown
 */
const resumeReminder = useCallback(async () => {
  const current = stateRef.current;
  if (!current.config || !current.isPaused) return;

  const now = Date.now();
  const remainingSec = current.pausedRemainingSeconds || current.secondsRemaining || current.config.totalSeconds;
  const nextChime = now + remainingSec * 1000;
  const cycleStart = nextChime - current.config.totalSeconds * 1000;

  const notificationIds = await scheduleNotificationsForState(current.config, remainingSec);

  setState((prev) => ({
    ...prev,
    isPaused: false,
    secondsRemaining: remainingSec,
    nextChimeTimestamp: nextChime,
    cycleStartedAt: cycleStart,
    pausedRemainingSeconds: null,
    scheduledNotificationIds: notificationIds,
  }));
  }, [scheduleNotificationsForState]);

/**
 * Reset current cycle back to beginning
 */
const resetCycle = useCallback(async () => {
  const current = stateRef.current;
  if (!current.config) return;

  const now = Date.now();
  const totalSec = current.config.totalSeconds;
  const nextChime = now + totalSec * 1000;

  const notificationIds = await scheduleNotificationsForState(current.config, totalSec);

  setState((prev) => ({
    ...prev,
    secondsRemaining: totalSec,
    nextChimeTimestamp: nextChime,
    cycleStartedAt: now,
    pausedRemainingSeconds: null,
    scheduledNotificationIds: notificationIds,
  }));
  }, [scheduleNotificationsForState]);

/**
 * Test beep sound
 */
const testBeep = useCallback(async (type?: SoundType) => {
  const sound = type || stateRef.current.config?.soundType || 'chime';
  await playBeepSound(sound);
}, []);

/**
 * Clear history
 */
const clearHistory = useCallback(() => {
  setHistory([]);
}, []);

const totalSec = state.config?.totalSeconds || 1;
const progress = state.isActive
  ? Math.max(0, Math.min(1, 1 - state.secondsRemaining / totalSec))
  : 0;

return {
  state,
  history,
  isLoaded,
  progress,
  startReminder,
  stopReminder,
  pauseReminder,
  resumeReminder,
  resetCycle,
  testBeep,
  clearHistory,
};
}
