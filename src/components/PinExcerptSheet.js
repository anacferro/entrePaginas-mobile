import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PIN_COLORS } from '../services/marks';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';

export default function PinExcerptSheet({ visible, excerpt, label, onSave, onClose }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(PIN_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setColor(PIN_COLORS[0]);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="bookmark" size={18} color={color} />
              <Text style={styles.title}>Marcar trecho</Text>
            </View>
            <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Touchable>
          </View>

          <View style={[styles.quote, { borderLeftColor: color }]}>
            <Text style={styles.quoteText} numberOfLines={4}>“{excerpt}”</Text>
            <Text style={styles.quoteLabel}>{label}</Text>
          </View>

          <Text style={styles.fieldLabel}>Nome do pino (opcional)</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Frase para lembrar"
            placeholderTextColor={colors.textMuted}
            maxLength={60}
            accessibilityLabel="Nome do pino"
          />

          <Text style={styles.fieldLabel}>Cor do pino</Text>
          <View style={styles.colors}>
            {PIN_COLORS.map((c, i) => (
              <Touchable
                key={c}
                style={[styles.colorOption, color === c && { borderColor: c }]}
                onPress={() => setColor(c)}
                accessibilityLabel={`Cor do pino ${i + 1}`}
                accessibilityState={{ selected: color === c }}
              >
                <Ionicons name="bookmark" size={22} color={c} />
              </Touchable>
            ))}
          </View>

          <Touchable style={styles.save} onPress={() => onSave({ title: title.trim(), color })} accessibilityLabel="Marcar trecho">
            <Ionicons name="bookmark" size={16} color={colors.onPrimary} />
            <Text style={styles.saveText}>Marcar trecho</Text>
          </Touchable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  quote: {
    padding: space.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    backgroundColor: colors.surfaceSoft,
    gap: 4,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: colors.text,
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontSize: 15,
    color: colors.text,
  },
  colors: {
    flexDirection: 'row',
    gap: 10,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
