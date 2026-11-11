import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';

const OPTIONS = [
  {
    id: 'ask',
    icon: 'chatbubble-ellipses-outline',
    title: 'Perguntar sobre a história',
    subtitle: 'Respostas só com o que você já leu, sem spoilers.',
  },
  {
    id: 'people',
    icon: 'people-outline',
    title: 'Mapa de personagens',
    subtitle: 'Quem é quem e como se relacionam, até aqui.',
  },
];

export default function AiMenu({ visible, onClose, onSelect }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar menu">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.titleRow}>
            <Ionicons name="sparkles" size={16} color={colors.secondary} />
            <Text style={styles.title}>Companheira de leitura</Text>
          </View>
          {OPTIONS.map((o) => (
            <Touchable key={o.id} style={styles.option} onPress={() => onSelect(o.id)} accessibilityLabel={o.title}>
              <View style={styles.iconBox}>
                <Ionicons name={o.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{o.title}</Text>
                <Text style={styles.optionSub}>{o.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Touchable>
          ))}
          <Text style={styles.note}>Para pedir a explicação de um trecho, ative o marca-texto, selecione e toque em Explicar.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: space.sm,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 64,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  optionSub: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: space.sm,
  },
});
