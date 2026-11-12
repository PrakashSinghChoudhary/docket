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

import { ActiveTimer } from '@/components/reminder/active-timer';
import { ReminderForm } from '@/components/reminder/reminder-form';
import { ReminderHistory } from '@/components/reminder/reminder-history';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useReminder } from '@/hooks/use-reminder';
import { useTheme } from '@/hooks/use-theme';
import { SoundType } from '@/services/sound';

export default function ReminderHomeScreen() {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();

  const {
    state,
    history,
    progress,
    startReminder,
    stopReminder,
    pauseReminder,
    resumeReminder,
    resetCycle,
    testBeep,
    clearHistory,
  } = useReminder();

  const [showConfigWhenActive, setShowConfigWhenActive] = useState(false);

  const handleTestSound = async (type: SoundType = 'chime') => {
    await testBeep(type);
  };

  const isTimerActive = state.isActive || state.isPaused;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                safeAreaInsets.bottom + BottomTabInset + Spacing.four,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {/* Header Bar */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Reminders</ThemedText>
          </View>

          {/* Active Countdown Screen (Visible when reminder is running or paused) */}
          {isTimerActive && (
            <ActiveTimer
              state={state}
              progress={progress}
              onStop={stopReminder}
              onPause={pauseReminder}
              onResume={resumeReminder}
              onReset={resetCycle}
              onTestSound={() => handleTestSound(state.config?.soundType || 'chime')}
            />
          )}

          {/* If timer is active, provide an expandable toggle to reconfigure */}
          {isTimerActive && (
            <Pressable
              style={({ pressed }) => [
                styles.toggleConfigBtn,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
              onPress={() => setShowConfigWhenActive((prev) => !prev)}>
              <ThemedText type="small" themeColor="textSecondary">
                {showConfigWhenActive
                  ? 'Hide setup'
                  : 'Adjust interval / change settings'}
              </ThemedText>
              <SymbolView
                name={{
                  ios: showConfigWhenActive ? 'chevron.up' : 'chevron.down',
                  android: showConfigWhenActive ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
                  web: showConfigWhenActive ? 'expand_less' : 'expand_more',
                }}
                size={14}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          )}

          {/* Configuration Form (Visible when idle OR when expanded during active) */}
          {(!isTimerActive || showConfigWhenActive) && (
            <ReminderForm
              onStart={(params) => {
                startReminder(params);
                setShowConfigWhenActive(false);
              }}
              onPreviewSound={handleTestSound}
              isTimerActive={isTimerActive}
            />
          )}

          {/* Recent Chimes History Log */}
          <ReminderHistory history={history} onClearHistory={clearHistory} />
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
    paddingVertical: Spacing.one,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    paddingBottom: 2,
  },
  toggleConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
});
