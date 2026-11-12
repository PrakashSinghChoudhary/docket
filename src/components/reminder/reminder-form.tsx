import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SoundType } from '@/services/sound';

interface ReminderFormProps {
  onStart: (params: {
    title: string;
    durationMinutes: number;
    durationSeconds: number;
    recurring: boolean;
    soundType: SoundType;
  }) => void;
  onPreviewSound: (type: SoundType) => void;
  isTimerActive: boolean;
}

interface Preset {
  label: string;
  minutes: number;
}

const PRESETS: Preset[] = [
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '20m', minutes: 20 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
];

const QUICK_TAGS = ['Drink Water', 'Eye Rest (20-20-20)', 'Stand & Stretch'];

export function ReminderForm({
  onStart,
  isTimerActive,
}: ReminderFormProps) {
  const theme = useTheme();
  const isDark = theme.background === '#000000';

  const [selectedMinutes, setSelectedMinutes] = useState(20);
  const [selectedSeconds] = useState(0);
  const [isRecurring, setIsRecurring] = useState(true);
  const [soundType] = useState<SoundType>('chime');
  const [title, setTitle] = useState('20m Focus');

  const handlePresetSelect = (minutes: number) => {
    setSelectedMinutes(minutes);
    setTitle(`${minutes}m Focus`);
  };

  const adjustMinutes = (delta: number) => {
    setSelectedMinutes((prev) => Math.max(0, Math.min(240, prev + delta)));
  };

  const handleStart = () => {
    if (selectedMinutes === 0 && selectedSeconds === 0) {
      setSelectedMinutes(20);
    }
    onStart({
      title: title.trim() || `${selectedMinutes}m Reminder`,
      durationMinutes: selectedMinutes,
      durationSeconds: selectedSeconds,
      recurring: isRecurring,
      soundType,
    });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top Group: Header & Presets (Taking most of the space) */}
      <View style={styles.topSection}>
        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            REMINDER FOR NEXT
          </ThemedText>
        </View>

        {/* Quick Interval Presets Grid */}
        <View style={styles.presetContainer}>
          {PRESETS.map((preset) => {
            const isSelected = selectedMinutes === preset.minutes;
            const pillBg = isSelected
              ? isDark
                ? '#FFFFFF'
                : '#000000'
              : theme.backgroundElement;
            const textColor = isSelected
              ? isDark
                ? '#000000'
                : '#FFFFFF'
              : theme.text;

            return (
              <Pressable
                key={preset.label}
                style={({ pressed }) => [
                  styles.presetPill,
                  {
                    backgroundColor: pillBg,
                    borderColor: isSelected
                      ? isDark
                        ? '#FFFFFF'
                        : '#000000'
                      : theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() => handlePresetSelect(preset.minutes)}>
                <ThemedText
                  style={[
                    styles.presetLabelText,
                    { color: textColor },
                  ]}>
                  {preset.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Middle Group: Stepper, Switch, Label */}
      <View style={styles.middleSection}>
        {/* Stepper Adjustment Controls */}
        <View
          style={[
            styles.stepperContainer,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}>
          <View style={styles.stepperSection}>
            <ThemedText type="small" themeColor="textSecondary">
              Minutes
            </ThemedText>
            <View style={styles.stepperControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.stepButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
                onPress={() => adjustMinutes(-5)}>
                <ThemedText type="smallBold">-5</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.stepButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
                onPress={() => adjustMinutes(-1)}>
                <ThemedText type="smallBold">-1</ThemedText>
              </Pressable>

              <View style={styles.stepperValueBox}>
                <ThemedText style={styles.stepperValue}>{selectedMinutes}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  min
                </ThemedText>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.stepButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
                onPress={() => adjustMinutes(1)}>
                <ThemedText type="smallBold">+1</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.stepButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
                onPress={() => adjustMinutes(5)}>
                <ThemedText type="smallBold">+5</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Recurrence Toggle Switch */}
        <View
          style={[
            styles.switchContainer,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}>
          <View style={styles.switchTitleRow}>
            <SymbolView
              name={{ ios: 'repeat', android: 'repeat', web: 'repeat' }}
              size={22}
              tintColor={isRecurring ? '#10B981' : theme.textSecondary}
            />
            <ThemedText type="smallBold" style={styles.foreverText}>
              Forever
            </ThemedText>
          </View>

          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: theme.backgroundSelected, true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Label / Preset Quick Tags */}
        <View style={styles.labelGroup}>
          <ThemedText type="smallBold" style={styles.subheading}>
            REMINDER LABEL
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. 20m Focus Beep"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          />

          <View style={styles.quickTagsContainer}>
            {QUICK_TAGS.map((tag) => (
              <Pressable
                key={tag}
                style={({ pressed }) => [
                  styles.tagPill,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() => setTitle(tag)}>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 13 }}>
                  {tag}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Group: Full-Width Start Button */}
      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
            },
            pressed && styles.pressed,
          ]}
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel={
            isTimerActive
              ? 'Update & Restart reminder'
              : isRecurring
                ? 'Start reminder'
                : 'Set reminder'
          }>
          <View style={styles.startIconContainer}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              size={18}
              style={styles.startIcon}
              tintColor={isDark ? '#000000' : '#FFFFFF'}
            />
          </View>
          <ThemedText
            type="smallBold"
            style={[
              styles.startButtonText,
              { color: isDark ? '#000000' : '#FFFFFF' },
            ]}>
            {isTimerActive
              ? 'Update & Restart'
              : isRecurring
                ? 'Start'
                : 'Set'}
          </ThemedText>
        </Pressable>
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
    flex: 1,
    gap: Spacing.three,
  },
  middleSection: {
    gap: Spacing.three,
  },
  bottomSection: {
    paddingTop: Spacing.two,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    letterSpacing: 1.2,
    fontSize: 13,
  },
  subheading: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  presetContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 280,
  },
  presetPill: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  presetLabelText: {
    fontSize: 24,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  stepperContainer: {
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
  },
  stepperSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  stepperValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: 8,
    minWidth: 54,
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  foreverText: {
    fontSize: 16,
  },
  labelGroup: {
    gap: 8,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  quickTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
  },
  startIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        transform: [{ translateX: 0.5 }, { translateY: 0.5 }],
      },
      default: {
        transform: [{ translateX: 0.5 }],
      },
    }),
  },
  startIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});
