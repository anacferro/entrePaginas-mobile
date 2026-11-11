import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';
import ProgressBar from './ProgressBar';
import StatusChip from './StatusChip';
import { STATUS, progressOf, formatDate, formatNumber } from '../services/readingStats';

function InfoRow({ label, value, styles }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ReadingProgressModal({
  visible,
  onClose,
  book,
  position,
  entry,
  forecast,
  onRegister,
  onToggleFinished,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (visible) setInput('');
  }, [visible]);

  if (!book) return null;

  const progress = progressOf(book, position, entry);
  const finished = progress.status === STATUS.FINISHED;
  const parsed = parseInt(input, 10);
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= progress.total;

  const submit = () => {
    if (!valid) return;
    onRegister(parsed);
    setInput('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
                <StatusChip status={progress.status} />
              </View>
              <Touchable
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel="Fechar progresso"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Touchable>
            </View>

            <View style={styles.percentRow}>
              <Text style={styles.percent}>{progress.percent}%</Text>
              <Text style={styles.percentHint}>
                página {formatNumber(progress.page)} de {formatNumber(progress.total)}
              </Text>
            </View>
            <ProgressBar value={progress.percent / 100} height={12} label="Progresso do livro" />

            <View style={styles.infoBox}>
              <InfoRow label="Início" value={formatDate(entry?.startedAt) || (progress.status === STATUS.PLANNED ? 'ainda não começou' : 'não registrado')} styles={styles} />
              <InfoRow
                label="Previsão de término"
                value={
                  finished
                    ? 'concluído'
                    : forecast
                      ? `${formatDate(forecast.date)} (${forecast.days} ${forecast.days === 1 ? 'dia' : 'dias'})`
                      : 'disponível após ler em 2 dias'
                }
                styles={styles}
              />
              <InfoRow label="Conclusão" value={formatDate(entry?.finishedAt) || '—'} styles={styles} />
            </View>

            <Text style={styles.fieldLabel}>Registrar página atual</Text>
            <View style={styles.registerRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={(text) => setInput(text.replace(/[^0-9]/g, ''))}
                placeholder={`1 a ${progress.total}`}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={submit}
                accessibilityLabel="Número da página"
              />
              <Touchable
                style={[styles.registerBtn, !valid && styles.disabled]}
                onPress={submit}
                disabled={!valid}
                accessibilityLabel="Ir para a página e registrar"
              >
                <Text style={styles.registerText}>Registrar</Text>
              </Touchable>
            </View>
            {input.length > 0 && !valid && (
              <Text style={styles.error}>Digite uma página entre 1 e {progress.total}.</Text>
            )}

            <Touchable style={styles.toggleBtn} onPress={() => onToggleFinished(!finished)}>
              <Ionicons
                name={finished ? 'refresh-outline' : 'checkmark-circle-outline'}
                size={18}
                color={colors.primary}
              />
              <Text style={styles.toggleText}>{finished ? 'Voltar para "lendo"' : 'Marcar como lido'}</Text>
            </Touchable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.lg,
  },
  headerText: {
    flex: 1,
    gap: space.sm,
  },
  title: {
    fontSize: 19,
    lineHeight: 25,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    marginBottom: space.sm,
  },
  percent: {
    fontSize: 36,
    lineHeight: 42,
    color: colors.primary,
    fontFamily: fonts.heading,
  },
  percentHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoBox: {
    marginTop: space.lg,
    marginBottom: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: space.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: space.sm,
  },
  registerRow: {
    flexDirection: 'row',
    gap: space.sm + 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontSize: 15,
    color: colors.text,
  },
  registerBtn: {
    flexShrink: 0,
    minHeight: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  disabled: {
    opacity: 0.45,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginTop: space.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    marginTop: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
