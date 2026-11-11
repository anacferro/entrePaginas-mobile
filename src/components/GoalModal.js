import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';

export default function GoalModal({ visible, current, onClose, onSave }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [value, setValue] = useState(current || 12);

  useEffect(() => {
    if (visible) setValue(current || 12);
  }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Meta de leitura</Text>
          <Text style={styles.sheetText}>Quantos livros você quer concluir em {new Date().getFullYear()}?</Text>
          <View style={styles.stepper}>
            <Touchable style={styles.stepBtn} onPress={() => setValue(Math.max(1, value - 1))} accessibilityLabel="Diminuir meta">
              <Ionicons name="remove" size={22} color={colors.primary} />
            </Touchable>
            <Text style={styles.stepValue}>{value}</Text>
            <Touchable style={styles.stepBtn} onPress={() => setValue(Math.min(365, value + 1))} accessibilityLabel="Aumentar meta">
              <Ionicons name="add" size={22} color={colors.primary} />
            </Touchable>
          </View>
          <View style={styles.sheetActions}>
            {current ? (
              <Touchable style={styles.ghostBtn} onPress={() => onSave(0)}>
                <Text style={styles.ghostText}>Remover meta</Text>
              </Touchable>
            ) : (
              <Touchable style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Touchable>
            )}
            <Touchable style={styles.primaryBtn} onPress={() => onSave(value)}>
              <Text style={styles.primaryText}>Salvar</Text>
            </Touchable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.xl, borderWidth: 1, borderColor: colors.borderLight },
  sheetTitle: { fontSize: 20, color: colors.text, fontFamily: fonts.heading },
  sheetText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl, marginVertical: space.xl },
  stepBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 64, textAlign: 'center', fontSize: 40, lineHeight: 46, color: colors.primary, fontFamily: fonts.heading },
  sheetActions: { flexDirection: 'row', gap: space.md },
  ghostBtn: { flex: 1, minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 14, fontWeight: '700', color: colors.text },
  primaryBtn: { flex: 1, minHeight: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
});
