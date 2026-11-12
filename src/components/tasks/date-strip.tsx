import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthHeader, getDaysOfWeek, parseDateString } from '@/utils/date';
import { DaySummary } from '@/hooks/use-tasks';

interface DateStripProps {
  selectedDate: string;
  todayDate: string;
  monthSummaries: Record<string, DaySummary>;
  onSelectDate: (date: string) => void;
  onOpenMonthArchive: () => void;
  onGoToToday: () => void;
}

export function DateStrip({
  selectedDate,
  todayDate,
  monthSummaries,
  onSelectDate,
  onOpenMonthArchive,
  onGoToToday,
}: DateStripProps) {
  const theme = useTheme();
  const isDark = theme.background === '#000000';
  const isToday = selectedDate === todayDate;

  const weekDays = getDaysOfWeek(selectedDate);
  const monthTitle = formatMonthHeader(selectedDate);

  const shiftWeek = (deltaDays: number) => {
    const current = parseDateString(selectedDate);
    current.setDate(current.getDate() + deltaDays);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    onSelectDate(`${year}-${month}-${day}`);
  };

  return (
    <View style={styles.container}>
      {/* Month Title & Navigation */}
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
          onPress={onOpenMonthArchive}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            size={16}
            tintColor={theme.text}
          />
          <ThemedText type="smallBold" style={styles.monthTitle}>
            {monthTitle}
          </ThemedText>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
            size={12}
            tintColor={theme.textSecondary}
          />
        </Pressable>

        <View style={styles.headerActions}>
          {!isToday && (
            <Pressable
              style={({ pressed }) => [
                styles.todayPill,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
              onPress={onGoToToday}>
              <ThemedText type="small" style={styles.todayPillText}>
                Today
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.arrowGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.arrowBtn,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
              onPress={() => shiftWeek(-7)}
              accessibilityRole="button"
              accessibilityLabel="Previous week">
              <View style={[styles.arrowIconContainer, styles.arrowLeftOffset]}>
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  size={14}
                  style={styles.centerIcon}
                  tintColor={theme.text}
                />
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.arrowBtn,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
              onPress={() => shiftWeek(7)}
              accessibilityRole="button"
              accessibilityLabel="Next week">
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
        </View>
      </View>

      {/* Week Days Strip */}
      <View style={styles.weekStrip}>
        {weekDays.map((dateStr) => {
          const d = parseDateString(dateStr);
          const dayName = d.toLocaleDateString([], { weekday: 'narrow' });
          const dayNumber = d.getDate();
          const isSelected = dateStr === selectedDate;
          const isCurrentToday = dateStr === todayDate;

          const summary = monthSummaries[dateStr];
          const hasTasks = summary && summary.total > 0;
          const isAllCompleted = hasTasks && summary.completed === summary.total;

          const cellBg = isSelected
            ? isDark
              ? '#FFFFFF'
              : '#000000'
            : theme.backgroundElement;
          const textColor = isSelected
            ? isDark
              ? '#000000'
              : '#FFFFFF'
            : theme.text;
          const subTextColor = isSelected
            ? isDark
              ? '#333333'
              : '#CCCCCC'
            : theme.textSecondary;

          return (
            <Pressable
              key={dateStr}
              style={({ pressed }) => [
                styles.dayCell,
                {
                  backgroundColor: cellBg,
                  borderColor: isCurrentToday && !isSelected
                    ? theme.text
                    : isSelected
                    ? isDark
                      ? '#FFFFFF'
                      : '#000000'
                    : theme.backgroundSelected,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => onSelectDate(dateStr)}>
              <ThemedText style={[styles.dayName, { color: subTextColor }]}>
                {dayName}
              </ThemedText>
              <ThemedText type="smallBold" style={[styles.dayNum, { color: textColor }]}>
                {dayNumber}
              </ThemedText>

              {/* Task dot indicator */}
              <View style={styles.dotContainer}>
                {hasTasks ? (
                  <View
                    style={[
                      styles.indicatorDot,
                      {
                        backgroundColor: isAllCompleted
                          ? '#10B981'
                          : isSelected
                          ? isDark
                            ? '#666666'
                            : '#888888'
                          : theme.textSecondary,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  arrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
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
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    minHeight: 56,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
  },
  dayNum: {
    fontSize: 15,
  },
  dotContainer: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  emptyDot: {
    width: 4,
    height: 4,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
});

