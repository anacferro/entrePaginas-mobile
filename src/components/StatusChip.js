import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { STATUS, STATUS_LABELS } from '../services/readingStats';

const ICONS = {
  [STATUS.PLANNED]: 'bookmark-outline',
  [STATUS.READING]: 'book-outline',
  [STATUS.FINISHED]: 'checkmark-circle-outline',
};

export default function StatusChip({ status, compact = false }) {
  const { colors } = useTheme();
  const palette = {
    [STATUS.PLANNED]: { bg: colors.surfaceSoft, fg: colors.textSecondary },
    [STATUS.READING]: { bg: colors.primaryLight, fg: colors.primary },
    [STATUS.FINISHED]: { bg: colors.successLight, fg: colors.success },
  }[status];

  return (
    <View style={[styles.chip, compact && styles.compact, { backgroundColor: palette.bg }]}>
      <Ionicons name={ICONS[status]} size={compact ? 11 : 13} color={palette.fg} />
      <Text style={[styles.text, compact && styles.compactText, { color: palette.fg }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  compact: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 10,
  },
});
