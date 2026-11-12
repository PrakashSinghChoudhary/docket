import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';

interface TaskInputProps {
  onAddTask: (text: string) => void;
  isToday: boolean;
  selectedDateFriendly: string;
}

export function TaskInput({ onAddTask, isToday, selectedDateFriendly }: TaskInputProps) {
  const [text, setText] = useState('');
  const theme = useTheme();
  const isDark = theme.background === '#000000';

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setText('');
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
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={
          isToday
            ? 'Add a task for today...'
            : `Add a task for ${selectedDateFriendly}...`
        }
        placeholderTextColor={theme.textSecondary}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        style={[styles.input, { color: theme.text }]}
      />

      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          {
            backgroundColor: text.trim()
              ? isDark
                ? '#FFFFFF'
                : '#000000'
              : theme.backgroundSelected,
          },
          pressed && styles.pressed,
        ]}
        onPress={handleSubmit}
        disabled={!text.trim()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Add task">
        <View style={styles.iconContainer}>
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            size={16}
            style={styles.plusIcon}
            tintColor={
              text.trim()
                ? isDark
                  ? '#000000'
                  : '#FFFFFF'
                : theme.textSecondary
            }
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        transform: [{ translateY: 0.5 }],
      },
      default: {},
    }),
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
