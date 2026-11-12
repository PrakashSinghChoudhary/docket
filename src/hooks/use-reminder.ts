import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playBeepSound, SoundType } from '@/services/sound';
import {
  cancelNotificationAsync,
  requestNotificationPermissionAsync,
  scheduleReminderNotificationAsync,
} from '@/services/notifications';

const STORAGE_KEY = '@reminder_active_state_v1';
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
  durationSeconds: number; // additional seconds
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
  scheduledNotificationId: string | null;
  nextChimeTimestamp: number | null;
}

const DEFAULT_STATE: ReminderState = {
  config: null,
  isActive: false,
  isPaused: false,
  secondsRemaining: 0,
  triggerCount: 0,
  lastTriggeredAt: null,
  scheduledNotificationId: null,
  nextChimeTimestamp: null,
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

  // References to keep callbacks and timers up-to-date without stale closures
  const stateRef = useRef<ReminderState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved state and history on initial mount
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
            // Reconcile wall-clock elapsed time
            const now = Date.now();
            const totalSec = parsed.config.totalSeconds;

            if (parsed.isPaused) {
              // If paused, keep remaining seconds as they were
              setState(parsed);
            } else {
              const elapsedSec = Math.floor((now - parsed.config.startedAt) / 1000);

              if (parsed.config.recurring) {
                const cyclesCompleted = Math.floor(elapsedSec / totalSec);
                const currentCycleElapsed = elapsedSec % totalSec;
                const remaining = totalSec - currentCycleElapsed;
                const nextRemaining = remaining > 0 ? remaining : totalSec;

                setState({
                  ...parsed,
                  triggerCount: cyclesCompleted,
                  secondsRemaining: nextRemaining,
                  nextChimeTimestamp: now + nextRemaining * 1000,
                });
              } else {
                if (elapsedSec >= totalSec) {
                  // Already expired while away
                  setState({
                    ...parsed,
                    isActive: false,
                    secondsRemaining: 0,
                    triggerCount: 1,
                    nextChimeTimestamp: null,
                  });
                } else {
                  const rem = totalSec - elapsedSec;
                  setState({
                    ...parsed,
                    secondsRemaining: rem,
                    nextChimeTimestamp: now + rem * 1000,
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

  // Persist state changes
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, isLoaded]);

  // Persist history changes
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => {});
  }, [history, isLoaded]);

  // Trigger sound, notification, and log history entry
  const handleTrigger = useCallback(async () => {
    const current = stateRef.current;
    if (!current.config) return;

    const soundType = current.config.soundType || 'chime';
    const now = Date.now();
    const cycleNum = current.triggerCount + 1;
    const itemTitle = current.config.title || 'Beep Reminder';

    // 1. Play the beep sound! (Guaranteed to be a beep and stop)
    await playBeepSound(soundType);

    // 2. Add to history
    const historyItem: ReminderHistoryItem = {
      id: `${now}-${cycleNum}`,
      timestamp: now,
      formattedTime: formatTimeOfDay(new Date(now)),
      cycleNumber: cycleNum,
      title: itemTitle,
    };
    setHistory((prev) => [historyItem, ...prev.slice(0, 49)]); // keep latest 50

    if (current.config.recurring) {
      // Recurring: reset countdown for next cycle
      setState((prev) => ({
        ...prev,
        triggerCount: prev.triggerCount + 1,
        lastTriggeredAt: now,
        secondsRemaining: prev.config ? prev.config.totalSeconds : 0,
        nextChimeTimestamp: prev.config ? now + prev.config.totalSeconds * 1000 : null,
      }));
    } else {
      // One-shot: complete reminder
      setState((prev) => ({
        ...prev,
        isActive: false,
        triggerCount: prev.triggerCount + 1,
        lastTriggeredAt: now,
        secondsRemaining: 0,
        nextChimeTimestamp: null,
      }));
    }
  }, []);

  // Main countdown timer interval
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (state.isActive && !state.isPaused) {
      timerRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev.isActive || prev.isPaused) return prev;

          if (prev.secondsRemaining <= 1) {
            // Trigger alert!
            setTimeout(() => {
              handleTrigger();
            }, 0);

            if (prev.config?.recurring) {
              return {
                ...prev,
                secondsRemaining: prev.config.totalSeconds,
              };
            }
            return {
              ...prev,
              isActive: false,
              secondsRemaining: 0,
            };
          }

          return {
            ...prev,
            secondsRemaining: prev.secondsRemaining - 1,
          };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isActive, state.isPaused, handleTrigger]);

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

      // Cancel previous notification if running
      if (stateRef.current.scheduledNotificationId) {
        await cancelNotificationAsync(stateRef.current.scheduledNotificationId);
      }

      // Request permission
      await requestNotificationPermissionAsync();

      // Schedule system background notification
      const notificationId = await scheduleReminderNotificationAsync({
        title: title || 'Beep Reminder',
        body: recurring
          ? `Recurring reminder: Every ${durationMinutes} min completed!`
          : `Your ${durationMinutes} min reminder reached!`,
        seconds: totalSeconds,
        repeats: recurring,
      });

      const now = Date.now();
      const config: ReminderConfig = {
        id: `rem_${now}`,
        title: title || 'Beep Reminder',
        durationMinutes,
        durationSeconds,
        totalSeconds,
        recurring,
        soundType,
        startedAt: now,
      };

      setState({
        config,
        isActive: true,
        isPaused: false,
        secondsRemaining: totalSeconds,
        triggerCount: 0,
        lastTriggeredAt: null,
        scheduledNotificationId: notificationId,
        nextChimeTimestamp: now + totalSeconds * 1000,
      });
    },
    []
  );

  /**
   * Switch off / turn off reminder completely
   */
  const stopReminder = useCallback(async () => {
    if (stateRef.current.scheduledNotificationId) {
      await cancelNotificationAsync(stateRef.current.scheduledNotificationId);
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
    if (stateRef.current.scheduledNotificationId) {
      await cancelNotificationAsync(stateRef.current.scheduledNotificationId);
    }
    setState((prev) => ({
      ...prev,
      isPaused: true,
      scheduledNotificationId: null,
    }));
  }, []);

  /**
   * Resume the paused countdown
   */
  const resumeReminder = useCallback(async () => {
    const current = stateRef.current;
    if (!current.config || !current.isPaused) return;

    let notificationId: string | null = null;
    if (current.secondsRemaining > 0) {
      notificationId = await scheduleReminderNotificationAsync({
        title: current.config.title,
        body: `Your reminder is ready!`,
        seconds: current.secondsRemaining,
        repeats: current.config.recurring,
      });
    }

    const now = Date.now();
    setState((prev) => ({
      ...prev,
      isPaused: false,
      scheduledNotificationId: notificationId,
      nextChimeTimestamp: now + prev.secondsRemaining * 1000,
    }));
  }, []);

  /**
   * Reset current cycle back to start
   */
  const resetCycle = useCallback(async () => {
    const current = stateRef.current;
    if (!current.config) return;

    if (current.scheduledNotificationId) {
      await cancelNotificationAsync(current.scheduledNotificationId);
    }

    const notificationId = await scheduleReminderNotificationAsync({
      title: current.config.title,
      body: `Recurring reminder cycle completed!`,
      seconds: current.config.totalSeconds,
      repeats: current.config.recurring,
    });

    const now = Date.now();
    setState((prev) => ({
      ...prev,
      secondsRemaining: prev.config ? prev.config.totalSeconds : 0,
      scheduledNotificationId: notificationId,
      nextChimeTimestamp: prev.config ? now + prev.config.totalSeconds * 1000 : null,
    }));
  }, []);

  /**
   * Test the beep sound
   */
  const testBeep = useCallback(async (type?: SoundType) => {
    const sound = type || stateRef.current.config?.soundType || 'chime';
    await playBeepSound(sound);
  }, []);

  /**
   * Clear trigger history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Compute progress ratio (0 to 1)
  const totalSec = state.config?.totalSeconds || 1;
  const progress = state.isActive ? Math.max(0, Math.min(1, 1 - state.secondsRemaining / totalSec)) : 0;

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
