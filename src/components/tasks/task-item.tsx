import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { TaskItem as TaskType } from '@/hooks/use-tasks';

interface TaskItemProps {
  task: TaskType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}>
      {/* Checkbox & Task text */}
      <Pressable
        style={styles.contentRow}
        onPress={() => onToggle(task.id)}>
        <View
          style={[
            styles.checkbox,
            task.completed
              ? styles.checkboxChecked
              : [styles.checkboxUnchecked, { borderColor: theme.backgroundSelected }],
          ]}>
          {task.completed && (
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={12}
              tintColor="#FFFFFF"
              weight="bold"
            />
          )}
        </View>

        <ThemedText
          style={[
            styles.taskText,
            task.completed && [styles.taskTextCompleted, { color: theme.textSecondary }],
          ]}>
          {task.text}
        </ThemedText>
      </Pressable>

      {/* Delete action */}
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
        onPress={() => onDelete(task.id)}
        hitSlop={8}>
        <SymbolView
          name={{ ios: 'trash', android: 'delete', web: 'delete' }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
  },
  taskText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  deleteBtn: {
    padding: 6,
  },
  pressed: {
    opacity: 0.6,
  },
});

