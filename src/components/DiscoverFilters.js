import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import { LANGUAGE_OPTIONS } from '../services/catalog/languages';
import { GENRES } from '../services/catalog/genres';
import Touchable from './Touchable';

export const EMPTY_FILTERS = { language: null, availability: 'any', genre: null, author: '', yearFrom: '', yearTo: '' };

export function countFilters(filters) {
  return [filters.language, filters.availability !== 'any', filters.genre, filters.author.trim(), filters.yearFrom, filters.yearTo].filter(Boolean).length;
}

function Chip({ label, active, onPress, styles }) {
  return (
    <Touchable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Touchable>
  );
}

export default function DiscoverFilters({ visible, filters, onApply, onClose }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar filtros" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtros</Text>
            <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Touchable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Disponibilidade</Text>
            <View style={styles.chips}>
              <Chip styles={styles} label="Todos" active={draft.availability === 'any'} onPress={() => set({ availability: 'any' })} />
              <Chip styles={styles} label="Só gratuitos" active={draft.availability === 'free'} onPress={() => set({ availability: 'free' })} />
              <Chip styles={styles} label="Lê no app" active={draft.availability === 'inapp'} onPress={() => set({ availability: 'inapp' })} />
            </View>

            <Text style={styles.label}>Idioma</Text>
            <View style={styles.chips}>
              <Chip styles={styles} label="Todos" active={!draft.language} onPress={() => set({ language: null })} />
              {LANGUAGE_OPTIONS.map((l) => (
                <Chip key={l.code} styles={styles} label={l.label} active={draft.language === l.code} onPress={() => set({ language: l.code })} />
              ))}
            </View>

            <Text style={styles.label}>Gênero</Text>
            <View style={styles.chips}>
              <Chip styles={styles} label="Todos" active={!draft.genre} onPress={() => set({ genre: null })} />
              {GENRES.map((g) => (
                <Chip key={g.key} styles={styles} label={g.label} active={draft.genre === g.key} onPress={() => set({ genre: g.key })} />
              ))}
            </View>

            <Text style={styles.label}>Autor</Text>
            <TextInput
              style={styles.input}
              value={draft.author}
              onChangeText={(author) => set({ author })}
              placeholder="Ex.: Machado de Assis"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Filtrar por autor"
            />

            <Text style={styles.label}>Ano de publicação</Text>
            <View style={styles.years}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={draft.yearFrom}
                onChangeText={(v) => set({ yearFrom: v.replace(/\D/g, '').slice(0, 4) })}
                placeholder="De"
                keyboardType="number-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Ano inicial"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={draft.yearTo}
                onChangeText={(v) => set({ yearTo: v.replace(/\D/g, '').slice(0, 4) })}
                placeholder="Até"
                keyboardType="number-pad"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Ano final"
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Touchable style={styles.clear} onPress={() => setDraft(EMPTY_FILTERS)} accessibilityLabel="Limpar filtros">
              <Text style={styles.clearText}>Limpar</Text>
            </Touchable>
            <Touchable style={styles.apply} onPress={() => onApply(draft)} accessibilityLabel="Aplicar filtros">
              <Text style={styles.applyText}>Aplicar</Text>
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: '85%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, color: colors.text, fontFamily: fonts.heading },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  body: { paddingBottom: space.md },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: space.lg, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  input: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontSize: 14,
    color: colors.text,
  },
  years: { flexDirection: 'row', gap: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: space.md },
  clear: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  apply: { flex: 2, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
});
