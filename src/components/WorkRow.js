import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { SOURCE_LABELS } from '../services/catalog/sources';
import { languageLabel } from '../services/catalog/languages';
import { genreLabel } from '../services/catalog/genres';
import Touchable from './Touchable';
import AccessBadge from './AccessBadge';

export function Cover({ uri, styles, color }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[styles.cover, styles.coverEmpty]}>
        <Ionicons name="book-outline" size={20} color={color} />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.cover} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />;
}

export default function WorkRow({ work, onPress, inLibrary }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const meta = [
    work.authors.join(', ') || 'Autor não informado',
    work.languages.length ? languageLabel(work.languages[0]) : null,
    work.firstYear,
  ].filter(Boolean).join(' • ');
  const sources = work.sources.map((s) => SOURCE_LABELS[s]).join(' · ');

  return (
    <Touchable
      style={styles.row}
      onPress={() => onPress(work)}
      accessibilityLabel={`${work.title}, ${meta}`}
    >
      <Cover uri={work.cover} styles={styles} color={colors.textMuted} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{work.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        <View style={styles.badges}>
          <AccessBadge level={work.best.access.level} compact />
          {work.best.access.inApp ? (
            <View style={styles.inApp}>
              <Ionicons name="book" size={10} color={colors.primary} />
              <Text style={styles.inAppText}>Lê no app</Text>
            </View>
          ) : null}
          {work.genres[0] ? <Text style={styles.genre} numberOfLines={1}>{genreLabel(work.genres[0])}</Text> : null}
        </View>
        <Text style={styles.sources} numberOfLines={1}>
          {sources}{work.editions.length > 1 ? ` • ${work.editions.length} edições` : ''}
        </Text>
      </View>
      {inLibrary ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.success} accessibilityLabel="Já na estante" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Touchable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    minHeight: 88,
  },
  cover: { width: 48, height: 70, borderRadius: 5, backgroundColor: colors.borderLight },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 15, color: colors.text, fontFamily: fonts.heading, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.textSecondary },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  inApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  inAppText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  genre: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  sources: { fontSize: 11, color: colors.textMuted },
});
