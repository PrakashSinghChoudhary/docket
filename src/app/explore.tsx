import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateStrip } from '@/components/tasks/date-strip';
import { MonthArchive } from '@/components/tasks/month-archive';
import { TaskInput } from '@/components/tasks/task-input';
import { TaskItem } from '@/components/tasks/task-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTasks } from '@/hooks/use-tasks';
import { useTheme } from '@/hooks/use-theme';
import { formatFriendlyDate, parseDateString } from '@/utils/date';

export default function TasksScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const isDark = theme.background === '#000000';

  const {
    todayDate,
    selectedDate,
    isToday,
    tasks,
    totalTasks,
    completedTasks,
    progressRatio,
    monthSummaries,
    unfinishedYesterdayCount,
    setSelectedDate,
    goToToday,
    addTask,
    toggleTask,
    deleteTask,
    carryOverYesterdayTasks,
  } = useTasks();

  const [showMonthArchive, setShowMonthArchive] = useState(false);
  const [dismissedRollover, setDismissedRollover] = useState(false);

  const selectedDateFriendly = formatFriendlyDate(selectedDate);
  const selectedDateObj = parseDateString(selectedDate);
  const fullDateText = selectedDateObj.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                safeAreaInsets.bottom + BottomTabInset + Spacing.five,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.headerTitle}>Daily Tasks</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.headerSubtitle}>
                {isToday ? `Today • ${fullDateText}` : `Viewing: ${fullDateText}`}
              </ThemedText>
            </View>

            {!isToday && (
              <Pressable
                style={({ pressed }) => [
                  styles.returnTodayButton,
                  { backgroundColor: isDark ? '#FFFFFF' : '#000000' },
                  pressed && styles.pressed,
                ]}
                onPress={goToToday}>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: isDark ? '#000000' : '#FFFFFF',
                    fontSize: 12,
                  }}>
                  Go to Today
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* Date Selector Strip (Week Navigator & Month Shortcut) */}
          <DateStrip
            selectedDate={selectedDate}
            todayDate={todayDate}
            monthSummaries={monthSummaries}
            onSelectDate={setSelectedDate}
            onOpenMonthArchive={() => setShowMonthArchive((prev) => !prev)}
            onGoToToday={goToToday}
          />

          {/* Month Archive Calendar (Accessible Months Data) */}
          {showMonthArchive && (
            <MonthArchive
              initialDate={selectedDate}
              monthSummaries={monthSummaries}
              onSelectDate={setSelectedDate}
              onClose={() => setShowMonthArchive(false)}
            />
          )}

          {/* Unfinished Yesterday Rollover Banner */}
          {isToday &&
            unfinishedYesterdayCount > 0 &&
            !dismissedRollover && (
              <View
                style={[
                  styles.rolloverCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}>
                <View style={styles.rolloverLeft}>
                  <SymbolView
                    name={{ ios: 'arrow.uturn.forward', android: 'redo', web: 'redo' }}
                    size={16}
                    tintColor="#10B981"
                  />
                  <ThemedText type="small" style={styles.rolloverText}>
                    {unfinishedYesterdayCount} unfinished from yesterday
                  </ThemedText>
                </View>

                <View style={styles.rolloverActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.rolloverBtn,
                      { backgroundColor: theme.backgroundSelected },
                      pressed && styles.pressed,
                    ]}
                    onPress={carryOverYesterdayTasks}>
                    <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                      Roll Over
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setDismissedRollover(true)}
                    hitSlop={6}>
                    <SymbolView
                      name={{ ios: 'xmark', android: 'close', web: 'close' }}
                      size={12}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            )}

          {/* Progress Summary Card */}
          {totalTasks > 0 && (
            <View
              style={[
                styles.progressCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}>
              <View style={styles.progressTextRow}>
                <ThemedText type="smallBold">
                  {completedTasks} of {totalTasks} completed
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[
                    styles.progressPercent,
                    { color: progressRatio === 1 ? '#10B981' : theme.textSecondary },
                  ]}>
                  {Math.round(progressRatio * 100)}%
                </ThemedText>
              </View>

              {/* Progress Track */}
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.backgroundSelected },
                ]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor: progressRatio === 1 ? '#10B981' : isDark ? '#FFFFFF' : '#000000',
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Add Task Input */}
          <TaskInput
            onAddTask={addTask}
            isToday={isToday}
            selectedDateFriendly={selectedDateFriendly}
          />

          {/* Tasks List */}
          <View style={styles.taskList}>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              ))
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}>
                <SymbolView
                  name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }}
                  size={32}
                  tintColor={theme.textSecondary}
                />
                <ThemedText type="smallBold" style={styles.emptyTitle}>
                  {isToday ? 'No tasks for today yet' : `No tasks on ${selectedDateFriendly}`}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.emptySubtitle}>
                  {isToday
                    ? 'Add tasks above to organize your day. Daily list resets overnight.'
                    : 'You can add past notes or browse other days in the month.'}
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.four : Spacing.two,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    paddingBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  returnTodayButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  rolloverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rolloverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rolloverText: {
    fontSize: 13,
  },
  rolloverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rolloverBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  progressCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2.5,
  },
  taskList: {
    gap: 8,
    paddingTop: 4,
  },
  emptyCard: {
    padding: Spacing.five,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 8,
    marginVertical: Spacing.three,
  },
  emptyTitle: {
    fontSize: 15,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
