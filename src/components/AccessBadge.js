import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accessInfo } from '../services/catalog/availability';
import { useThemedStyles } from '../theme/ThemeContext';

const ICONS = {
  dominio_publico: 'ribbon-outline',
  acesso_aberto: 'lock-open-outline',
  livre: 'checkmark-circle-outline',
  emprestimo: 'swap-horizontal-outline',
  previa: 'eye-outline',
  restrito: 'lock-closed-outline',
  sem_texto: 'document-outline',
  nao_confirmado: 'help-circle-outline',
};

export default function AccessBadge({ level, compact }) {
  const styles = useThemedStyles(createStyles);
  const info = accessInfo(level);
  const tone = styles[info.tone] || styles.muted;
  return (
    <View
      style={[styles.badge, tone.box]}
      accessible
      accessibilityLabel={`${info.label}. ${info.hint}`}
    >
      <Ionicons name={ICONS[level] || 'help-circle-outline'} size={compact ? 11 : 13} color={tone.text.color} />
      <Text style={[styles.text, tone.text, compact && { fontSize: 10 }]} numberOfLines={1}>{info.label}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: { fontSize: 11, fontWeight: '700' },
  good: {
    box: { backgroundColor: colors.successLight, borderColor: colors.successBorder },
    text: { color: colors.success },
  },
  warn: {
    box: { backgroundColor: colors.warningLight, borderColor: colors.warningBorder },
    text: { color: colors.warningText },
  },
  muted: {
    box: { backgroundColor: colors.surfaceSoft, borderColor: colors.borderLight },
    text: { color: colors.textSecondary },
  },
});
