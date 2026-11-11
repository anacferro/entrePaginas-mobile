import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function SpoilerBadge({ upTo, total, style }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.badge, style]} accessibilityLabel={`Sem spoilers, até a folha ${upTo} de ${total}`}>
      <Ionicons name="shield-checkmark" size={14} color={colors.onPrimary} />
      <Text style={styles.text} numberOfLines={1}>Sem spoilers · até a folha {upTo}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
