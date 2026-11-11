import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai } from '../services/ai';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';

export function SpoilerBadge({ spoilerFree, upTo, total, onPress, style }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const label = spoilerFree ? `Sem spoilers · até a folha ${upTo}` : 'Spoilers liberados';

  return (
    <Touchable
      style={[styles.badge, spoilerFree ? styles.badgeOn : styles.badgeOff, style]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`${label} de ${total}`}
    >
      <Ionicons
        name={spoilerFree ? 'shield-checkmark' : 'shield-outline'}
        size={14}
        color={spoilerFree ? colors.onPrimary : colors.textSecondary}
      />
      <Text style={[styles.badgeText, spoilerFree && styles.badgeTextOn]} numberOfLines={1}>{label}</Text>
    </Touchable>
  );
}

export default function SpoilerPill({ spoilerFree, upTo, total, onPress }) {
  if (!ai.isAvailable) return null;
  return <SpoilerBadge spoilerFree={spoilerFree} upTo={upTo} total={total} onPress={onPress} style={styles.pill} />;
}

const createStyles = (colors) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 17,
  },
  badgeOn: {
    backgroundColor: colors.primary,
  },
  badgeOff: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badgeTextOn: {
    color: colors.onPrimary,
  },
});

const styles = StyleSheet.create({
  pill: {
    marginBottom: 16,
  },
});
