import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatSecondsToDisplay, formatTimeOfDay, ReminderState } from '@/hooks/use-reminder';
import { useTheme } from '@/hooks/use-theme';

interface ActiveTimerProps {
  state: ReminderState;
  progress: number;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onTestSound: () => void;
}

export function ActiveTimer({
  state,
  progress,
  onStop,
  onPause,
  onResume,
  onReset,
  onTestSound,
}: ActiveTimerProps) {
  const theme = useTheme();
  const isDark = theme.background === '#000000';

  if (!state.isActive && !state.isPaused) {
    return null;
  }

  const config = state.config;
  const isPaused = state.isPaused;
  const formattedNextTime = state.nextChimeTimestamp
    ? formatTimeOfDay(new Date(state.nextChimeTimestamp))
    : '--:--';

  const durationLabel = config
    ? config.durationMinutes > 0
      ? `${config.durationMinutes} min${config.durationSeconds > 0 ? ` ${config.durationSeconds}s` : ''}`
      : `${config.durationSeconds}s`
    : '20 min';

  return (
    <ThemedView style={styles.container}>
      {/* Top Status & Recurrence Row */}
      <View style={styles.topSection}>
        <View style={styles.topRow}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.pulseDot,
                { backgroundColor: config?.recurring ? '#10B981' : isDark ? '#FFFFFF' : '#000000' },
              ]}
            />
            <ThemedText type="smallBold" style={styles.statusText}>
              {isPaused
                ? 'PAUSED'
                : config?.recurring
                  ? `REPEATING EVERY ${durationLabel.toUpperCase()}`
                  : 'COUNTDOWN'}
            </ThemedText>
          </View>

        </View>
      </View>

      {/* Center Countdown Display */}
      <View style={styles.centerSection}>
        <View style={styles.timerDisplayContainer}>
          <ThemedText style={styles.timerText}>
            {formatSecondsToDisplay(state.secondsRemaining)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.timerLabel}>
            {config?.title || 'Beep Reminder'}
          </ThemedText>
        </View>

        {/* Progress Bar (Pure Black and White) */}
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: isDark ? '#FFFFFF' : '#000000',
              },
            ]}
          />
        </View>

        {/* Cycle & Next Beep Meta Info */}
        <View
          style={[
            styles.metaRow,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}>
          <View style={styles.metaItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Next Beep
            </ThemedText>
            <ThemedText type="smallBold" style={styles.metaValue}>
              {isPaused ? 'Paused' : formattedNextTime}
            </ThemedText>
          </View>

          <View style={[styles.metaDivider, { backgroundColor: theme.backgroundSelected }]} />

          <View style={styles.metaItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Completed
            </ThemedText>
            <ThemedText type="smallBold" style={styles.metaValue}>
              {state.triggerCount} {state.triggerCount === 1 ? 'cycle' : 'cycles'}
            </ThemedText>
          </View>

          <View style={[styles.metaDivider, { backgroundColor: theme.backgroundSelected }]} />

          <View style={styles.metaItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Repeat
            </ThemedText>
            <ThemedText
              type="smallBold"
              style={[
                styles.metaValue,
                { color: config?.recurring ? '#10B981' : theme.text },
              ]}>
              {config?.recurring ? 'Forever' : 'Off'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Bottom Action Controls */}
      <View style={styles.bottomSection}>
        <View style={styles.controlsRow}>
          {/* Switch Off / Stop Button (RED) */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.stopButton,
              pressed && styles.pressed,
            ]}
            onPress={onStop}>
            <View style={styles.actionIconContainer}>
              <SymbolView
                name={{ ios: 'stop.fill', android: 'stop', web: 'stop' }}
                size={18}
                style={styles.centerIcon}
                tintColor="#EF4444"
              />
            </View>
            <ThemedText type="smallBold" style={styles.stopButtonText}>
              Switch Off
            </ThemedText>
          </Pressable>

          {/* Pause / Resume Button (Monochrome) */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.secondaryButton,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}
            onPress={isPaused ? onResume : onPause}>
            <View
              style={[
                styles.actionIconContainer,
                isPaused && styles.playIconOffset,
              ]}>
              <SymbolView
                name={{
                  ios: isPaused ? 'play.fill' : 'pause.fill',
                  android: isPaused ? 'play_arrow' : 'pause',
                  web: isPaused ? 'play_arrow' : 'pause',
                }}
                size={18}
                style={styles.centerIcon}
                tintColor={theme.text}
              />
            </View>
            <ThemedText type="smallBold">
              {isPaused ? 'Resume' : 'Pause'}
            </ThemedText>
          </Pressable>

          {/* Reset Current Cycle Button (Monochrome) */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.secondaryButton,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}
            onPress={onReset}>
            <View style={styles.actionIconContainer}>
              <SymbolView
                name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
                size={18}
                style={styles.centerIcon}
                tintColor={theme.textSecondary}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Restart
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.four,
  },
  topSection: {
    paddingTop: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    letterSpacing: 1.2,
    fontSize: 12,
  },
  soundTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  soundTestText: {
    fontSize: 12,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    width: '100%',
    paddingVertical: Spacing.four,
  },
  timerDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 80,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    lineHeight: 88,
  },
  timerLabel: {
    fontSize: 16,
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  metaValue: {
    fontSize: 15,
  },
  bottomSection: {
    paddingTop: Spacing.two,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
  },
  actionIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOffset: {
    ...Platform.select({
      ios: {
        transform: [{ translateX: 0.5 }, { translateY: 0.5 }],
      },
      default: {
        transform: [{ translateX: 0.5 }],
      },
    }),
  },
  centerIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  stopButtonText: {
    color: '#EF4444',
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
