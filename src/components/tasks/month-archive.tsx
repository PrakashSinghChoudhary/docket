import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { DaySummary } from '@/hooks/use-tasks';
import { getLocalDateString, getMonthDays, parseDateString } from '@/utils/date';

interface MonthArchiveProps {
  initialDate: string;
  monthSummaries: Record<string, DaySummary>;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const WEEKDAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MonthArchive({
  initialDate,
  monthSummaries,
  onSelectDate,
  onClose,
}: MonthArchiveProps) {
  const theme = useTheme();
  const isDark = theme.background === '#000000';
  const todayStr = getLocalDateString();

  const initialParsed = parseDateString(initialDate);
  const [viewYear, setViewYear] = useState(initialParsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialParsed.getMonth());

  const daysInMonth = getMonthDays(viewYear, viewMonth);

  // Determine starting day of week for first day of month (0 = Mon, 6 = Sun)
  const firstDayObj = new Date(viewYear, viewMonth, 1);
  const firstDayWeekday = (firstDayObj.getDay() + 6) % 7;

  const monthLabel = firstDayObj.toLocaleDateString([], { month: 'long', year: 'numeric' });

  // Calculate monthly stats from monthSummaries
  let totalTasksMonth = 0;
  let completedTasksMonth = 0;
  let activeDaysMonth = 0;

  daysInMonth.forEach((dateStr) => {
    const summary = monthSummaries[dateStr];
    if (summary && summary.total > 0) {
      activeDaysMonth += 1;
      totalTasksMonth += summary.total;
      completedTasksMonth += summary.completed;
    }
  });

  const completionRate = totalTasksMonth > 0
    ? Math.round((completedTasksMonth / totalTasksMonth) * 100)
    : 0;

  const changeMonth = (delta: number) => {
    const nextDate = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(nextDate.getFullYear());
    setViewMonth(nextDate.getMonth());
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}>
      {/* Header with Month Switcher and Close */}
      <View style={styles.header}>
        <View style={styles.monthNav}>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            onPress={() => changeMonth(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month">
            <View style={[styles.arrowIconContainer, styles.arrowLeftOffset]}>
              <SymbolView
                name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                size={14}
                style={styles.centerIcon}
                tintColor={theme.text}
              />
            </View>
          </Pressable>

          <ThemedText type="smallBold" style={styles.monthLabel}>
            {monthLabel}
          </ThemedText>

          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            onPress={() => changeMonth(1)}
            accessibilityRole="button"
            accessibilityLabel="Next month">
            <View style={[styles.arrowIconContainer, styles.arrowRightOffset]}>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={14}
                style={styles.centerIcon}
                tintColor={theme.text}
              />
            </View>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          onPress={onClose}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={14}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </View>

      {/* Monthly Summary Stats Card */}
      <View
        style={[
          styles.statsCard,
          {
            backgroundColor: theme.backgroundSelected,
          },
        ]}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statNumber}>{totalTasksMonth}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
            Total Tasks
          </ThemedText>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <ThemedText style={styles.statNumber}>{completedTasksMonth}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
            Completed
          </ThemedText>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: completionRate > 0 ? '#10B981' : theme.text }]}>
            {completionRate}%
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
            Rate
          </ThemedText>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <ThemedText style={styles.statNumber}>{activeDaysMonth}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
            Days Active
          </ThemedText>
        </View>
      </View>

      {/* Calendar Grid Header: Weekday Labels */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_NAMES.map((name, idx) => (
          <ThemedText key={idx} style={styles.weekdayText}>
            {name}
          </ThemedText>
        ))}
      </View>

      {/* Calendar Grid Days */}
      <View style={styles.daysGrid}>
        {/* Leading empty cells before the 1st */}
        {Array.from({ length: firstDayWeekday }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.dayCellWrapper} />
        ))}

        {/* Days of the month */}
        {daysInMonth.map((dateStr) => {
          const d = parseDateString(dateStr);
          const dayNum = d.getDate();
          const summary = monthSummaries[dateStr];
          const hasTasks = summary && summary.total > 0;
          const isAllCompleted = hasTasks && summary.completed === summary.total;
          const isCurrentToday = dateStr === todayStr;

          return (
            <View key={dateStr} style={styles.dayCellWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.calendarDayCell,
                  hasTasks && {
                    backgroundColor: theme.backgroundSelected,
                  },
                  isCurrentToday && {
                    borderColor: isDark ? '#FFFFFF' : '#000000',
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  onSelectDate(dateStr);
                  onClose();
                }}>
                <ThemedText
                  style={[
                    styles.calendarDayNum,
                    isCurrentToday && styles.todayDayNum,
                  ]}>
                  {dayNum}
                </ThemedText>

                {hasTasks && (
                  <View
                    style={[
                      styles.calendarDot,
                      {
                        backgroundColor: isAllCompleted ? '#10B981' : theme.textSecondary,
                      },
                    ]}
                  />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIconContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeftOffset: {
    transform: [{ translateX: 1 }],
  },
  arrowRightOffset: {
    transform: [{ translateX: -1 }],
  },
  centerIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  calendarDayCell: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 2,
  },
  calendarDayNum: {
    fontSize: 13,
  },
  todayDayNum: {
    fontWeight: '700',
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
