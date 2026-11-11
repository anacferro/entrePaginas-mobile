import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import { accessInfo } from '../services/catalog/availability';
import { SOURCE_LABELS } from '../services/catalog/sources';
import { languageLabel } from '../services/catalog/languages';
import { genreLabel } from '../services/catalog/genres';
import Touchable from './Touchable';
import AccessBadge from './AccessBadge';
import { Cover } from './WorkRow';

const FORMAT_LABELS = { epub: 'EPUB', txt: 'Texto', html: 'HTML', pdf: 'PDF', online: 'Leitura online' };

export default function WorkDetail({ work, visible, onClose, onAdd, inLibrary, adding, extra }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (!work) return null;

  const best = work.best;
  const info = accessInfo(best.access.level);
  const usable = (offer) => offer.access.level !== 'sem_texto';
  const shown = work.editions
    .map((edition) => {
      const seen = new Set();
      const offers = edition.offers.filter(usable).filter((o) => {
        const key = `${o.source}|${o.access.level}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...edition, offers };
    })
    .filter((edition) => edition.offers.length > 0);
  const hidden = work.editions.length - shown.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar detalhes" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Detalhes do livro</Text>
            <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Touchable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.top}>
              <Cover uri={work.cover} styles={{ cover: styles.cover, coverEmpty: styles.coverEmpty }} color={colors.textMuted} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.title}>{work.title}</Text>
                <Text style={styles.authors}>{work.authors.join(', ') || 'Autor não informado'}</Text>
                <Text style={styles.meta}>
                  {[work.languages.map(languageLabel).join(', '), work.firstYear, work.genres.map(genreLabel).join(', ')].filter(Boolean).join(' • ')}
                </Text>
                <View style={{ marginTop: 4 }}>
                  <AccessBadge level={best.access.level} />
                </View>
              </View>
            </View>

            <View style={[styles.note, info.free ? styles.noteGood : styles.noteWarn]}>
              <Ionicons name={info.free ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={18} color={info.free ? colors.success : colors.warningText} />
              <Text style={[styles.noteText, { color: info.free ? colors.success : colors.warningText }]}>
                {best.access.note || info.hint}
                {best.access.inApp ? ' Pode ser lido dentro do app.' : ' Não abre dentro do app: a leitura fica na plataforma de origem.'}
              </Text>
            </View>

            {work.description ? <Text style={styles.description} numberOfLines={8}>{work.description}</Text> : null}

            {extra}

            <Text style={styles.sectionTitle}>Edições e fontes</Text>
            {shown.map((edition) => (
              <View key={edition.id} style={styles.edition}>
                <Text style={styles.editionTitle}>
                  {[edition.language ? languageLabel(edition.language) : 'Idioma não informado', edition.year, edition.publisher].filter(Boolean).join(' • ')}
                </Text>
                {edition.offers.map((offer) => (
                  <View key={`${offer.source}:${offer.sourceId}`} style={styles.offer}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.offerSource}>{SOURCE_LABELS[offer.source]}</Text>
                      <View style={styles.offerBadges}>
                        <AccessBadge level={offer.access.level} compact />
                        {(offer.access.formats || []).map((f) => (
                          <Text key={f} style={styles.format}>{FORMAT_LABELS[f] || f}</Text>
                        ))}
                      </View>
                    </View>
                    {offer.url ? (
                      <Touchable
                        style={styles.open}
                        onPress={() => Linking.openURL(offer.url)}
                        accessibilityLabel={`Abrir em ${SOURCE_LABELS[offer.source]}`}
                      >
                        <Ionicons name="open-outline" size={16} color={colors.primary} />
                        <Text style={styles.openText}>Abrir</Text>
                      </Touchable>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
            {hidden > 0 ? (
              <Text style={styles.confidence}>
                {hidden === 1 ? 'Mais 1 edição' : `Mais ${hidden} edições`} registrada{hidden === 1 ? '' : 's'} sem texto disponível online.
              </Text>
            ) : null}
            {work.confidence < 0.9 ? (
              <Text style={styles.confidence}>
                Edições agrupadas por título e autor, com confiança de {Math.round(work.confidence * 100)}%. Confira antes de assumir que são a mesma obra.
              </Text>
            ) : null}
          </ScrollView>

          <Touchable
            style={[styles.add, (inLibrary || adding) && styles.addDisabled]}
            onPress={onAdd}
            disabled={inLibrary || adding}
            accessibilityLabel={inLibrary ? 'Já está na estante' : 'Adicionar à estante'}
          >
            {adding ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name={inLibrary ? 'checkmark' : 'add'} size={18} color={colors.onPrimary} />
                <Text style={styles.addText}>{inLibrary ? 'Na sua estante' : 'Adicionar à estante'}</Text>
              </>
            )}
          </Touchable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  headerTitle: { fontSize: 18, color: colors.text, fontFamily: fonts.heading },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  body: { paddingBottom: space.md, gap: space.md },
  top: { flexDirection: 'row', gap: space.md },
  cover: { width: 84, height: 122, borderRadius: 6, backgroundColor: colors.borderLight },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, lineHeight: 25, color: colors.text, fontFamily: fonts.heading },
  authors: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  meta: { fontSize: 12, color: colors.textMuted },
  note: { flexDirection: 'row', gap: 8, padding: space.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'flex-start' },
  noteGood: { backgroundColor: colors.successLight, borderColor: colors.successBorder },
  noteWarn: { backgroundColor: colors.warningLight, borderColor: colors.warningBorder },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  description: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: space.sm },
  edition: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, padding: space.md, gap: space.sm, backgroundColor: colors.card },
  editionTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  offer: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  offerSource: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  offerBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  format: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  openText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  confidence: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: space.sm,
  },
  addDisabled: { opacity: 0.6 },
  addText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
});
