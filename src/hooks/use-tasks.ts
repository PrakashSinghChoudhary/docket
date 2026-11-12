import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { getLocalDateString } from '@/utils/date';

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number | null;
}

export interface DaySummary {
  date: string;
  total: number;
  completed: number;
}

const INDEX_KEY = '@task_dates_index_v1';
const TASK_KEY_PREFIX = '@task_day_';

export function useTasks() {
  const [todayDate, setTodayDate] = useState<string>(getLocalDateString());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [datesIndex, setDatesIndex] = useState<string[]>([]);
  const [monthSummaries, setMonthSummaries] = useState<Record<string, DaySummary>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [unfinishedYesterdayCount, setUnfinishedYesterdayCount] = useState(0);

  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Load the list of dates that have tasks stored
  const loadDatesIndex = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(INDEX_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        setDatesIndex(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load tasks index:', e);
    }
    return [];
  }, []);

  // Load tasks for a specific date
  const loadTasksForDate = useCallback(async (dateStr: string) => {
    try {
      const raw = await AsyncStorage.getItem(`${TASK_KEY_PREFIX}${dateStr}`);
      if (raw) {
        const parsed: TaskItem[] = JSON.parse(raw);
        return parsed;
      }
    } catch (e) {
      console.warn(`Failed to load tasks for ${dateStr}:`, e);
    }
    return [];
  }, []);

  // Check for unfinished tasks from previous day
  const checkYesterdayTasks = useCallback(async (currentToday: string) => {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const yesterdayStr = getLocalDateString(today);

    const yesterdayTasks = await loadTasksForDate(yesterdayStr);
    const unfinished = yesterdayTasks.filter((t) => !t.completed);
    setUnfinishedYesterdayCount(unfinished.length);
  }, [loadTasksForDate]);

  // Midnight reset checker: resets to new day when date changes
  const checkDayRollover = useCallback(() => {
    const realToday = getLocalDateString();
    setTodayDate((prevToday) => {
      if (prevToday !== realToday) {
        // Date changed (midnight passed)!
        if (selectedDateRef.current === prevToday) {
          // If viewing today, advance selected date to new today
          setSelectedDate(realToday);
        }
        checkYesterdayTasks(realToday);
        return realToday;
      }
      return prevToday;
    });
  }, [checkYesterdayTasks]);

  // Initial load
  useEffect(() => {
    async function init() {
      const index = await loadDatesIndex();
      const currentToday = getLocalDateString();
      setTodayDate(currentToday);
      setSelectedDate(currentToday);

      const todayTasks = await loadTasksForDate(currentToday);
      setTasks(todayTasks);

      await checkYesterdayTasks(currentToday);
      setIsLoaded(true);

      // Pre-calculate month summaries for the index
      const summaries: Record<string, DaySummary> = {};
      for (const d of index) {
        const dayList = await loadTasksForDate(d);
        summaries[d] = {
          date: d,
          total: dayList.length,
          completed: dayList.filter((t) => t.completed).length,
        };
      }
      setMonthSummaries(summaries);
    }

    init();
  }, [loadDatesIndex, loadTasksForDate, checkYesterdayTasks]);

  // Listen to AppState to handle overnight background reset
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkDayRollover();
      }
    });

    // Also check every minute in case app is open at midnight
    const interval = setInterval(checkDayRollover, 60000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [checkDayRollover]);

  // Whenever selectedDate changes, load its tasks
  useEffect(() => {
    if (!isLoaded) return;
    let isCancelled = false;

    loadTasksForDate(selectedDate).then((loaded) => {
      if (!isCancelled) {
        setTasks(loaded);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, isLoaded, loadTasksForDate]);

  // Save tasks for the active selectedDate
  const saveTasks = useCallback(
    async (updatedTasks: TaskItem[], targetDate: string = selectedDate) => {
      try {
        await AsyncStorage.setItem(
          `${TASK_KEY_PREFIX}${targetDate}`,
          JSON.stringify(updatedTasks)
        );

        // Update index
        setDatesIndex((prev) => {
          if (!prev.includes(targetDate)) {
            const nextIndex = [...prev, targetDate];
            AsyncStorage.setItem(INDEX_KEY, JSON.stringify(nextIndex)).catch(() => {});
            return nextIndex;
          }
          return prev;
        });

        // Update summaries
        setMonthSummaries((prev) => ({
          ...prev,
          [targetDate]: {
            date: targetDate,
            total: updatedTasks.length,
            completed: updatedTasks.filter((t) => t.completed).length,
          },
        }));
      } catch (e) {
        console.warn('Failed to save tasks:', e);
      }
    },
    [selectedDate]
  );

  // Add task to currently selected date
  const addTask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const newTask: TaskItem = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text: trimmed,
        completed: false,
        createdAt: Date.now(),
        completedAt: null,
      };

      const nextTasks = [newTask, ...tasks];
      setTasks(nextTasks);
      await saveTasks(nextTasks, selectedDate);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [tasks, selectedDate, saveTasks]
  );

  // Check off or uncheck a task
  const toggleTask = useCallback(
    async (taskId: string) => {
      const nextTasks = tasks.map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? Date.now() : null,
          };
        }
        return t;
      });

      setTasks(nextTasks);
      await saveTasks(nextTasks, selectedDate);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    },
    [tasks, selectedDate, saveTasks]
  );

  // Delete a task
  const deleteTask = useCallback(
    async (taskId: string) => {
      const nextTasks = tasks.filter((t) => t.id !== taskId);
      setTasks(nextTasks);
      await saveTasks(nextTasks, selectedDate);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    },
    [tasks, selectedDate, saveTasks]
  );

  // Rollover / carry forward unfinished tasks from yesterday into today
  const carryOverYesterdayTasks = useCallback(async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const yesterdayTasks = await loadTasksForDate(yesterdayStr);
    const unfinished = yesterdayTasks.filter((t) => !t.completed);

    if (unfinished.length === 0) {
      setUnfinishedYesterdayCount(0);
      return;
    }

    const carriedTasks: TaskItem[] = unfinished.map((t) => ({
      ...t,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      completedAt: null,
    }));

    const nextTasks = [...carriedTasks, ...tasks];
    setTasks(nextTasks);
    await saveTasks(nextTasks, todayDate);
    setUnfinishedYesterdayCount(0);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [tasks, todayDate, loadTasksForDate, saveTasks]);

  // Jump to today
  const goToToday = useCallback(() => {
    const current = getLocalDateString();
    setSelectedDate(current);
  }, []);

  // Compute metrics for the active selected day
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progressRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const isToday = selectedDate === todayDate;

  return {
    todayDate,
    selectedDate,
    isToday,
    tasks,
    totalTasks,
    completedTasks,
    progressRatio,
    datesIndex,
    monthSummaries,
    unfinishedYesterdayCount,
    isLoaded,
    setSelectedDate,
    goToToday,
    addTask,
    toggleTask,
    deleteTask,
    carryOverYesterdayTasks,
  };
}
