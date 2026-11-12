import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ReminderHistoryItem } from '@/hooks/use-reminder';

interface ReminderHistoryProps {
  history: ReminderHistoryItem[];
  onClearHistory: () => void;
}

export function ReminderHistory({ history, onClearHistory }: ReminderHistoryProps) {
  const theme = useTheme();

  if (history.length === 0) {
    return null;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <SymbolView
            name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }}
            size={14}
            tintColor={theme.textSecondary}
          />
          <ThemedText type="smallBold" style={styles.title}>
            RECENT CHIMES ({history.length})
          </ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
          onPress={onClearHistory}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.clearText}>
            Clear
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.list}>
        {history.slice(0, 5).map((item) => (
          <View
            key={item.id}
            style={[styles.historyRow, { borderBottomColor: theme.backgroundSelected }]}>
            <View style={styles.leftCol}>
              <View style={styles.dot} />
              <ThemedText type="smallBold" style={styles.cycleText}>
                Beep #{item.cycleNumber}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.itemTitle}>
                {item.title}
              </ThemedText>
            </View>

            <View style={styles.rightCol}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
                {item.formattedTime}
              </ThemedText>
              <ThemedText type="small" style={styles.soundBadge}>
                Played & stopped
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    letterSpacing: 0.8,
    fontSize: 12,
  },
  clearBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearText: {
    fontSize: 12,
  },
  list: {
    gap: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#888888',
  },
  cycleText: {
    fontSize: 13,
  },
  itemTitle: {
    fontSize: 12,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  timeText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  soundBadge: {
    fontSize: 10,
    color: '#888888',
  },
  pressed: {
    opacity: 0.6,
  },
});

