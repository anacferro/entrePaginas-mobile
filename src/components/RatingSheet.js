import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';
import StarRating from './StarRating';
import { storage } from '../services/storage';
import { ASPECTS } from '../services/personal';
import { bookWorkId, bookAuthors } from '../services/catalog/identity';

const SURPRISE = [
  { key: 'surpreendente', label: 'Surpreendente' },
  { key: 'previsivel', label: 'Previsível' },
];

export function ratingInfoFor(book, totalPages) {
  return {
    workId: bookWorkId(book),
    bookId: book.id,
    title: book.title,
    authors: bookAuthors(book),
    genres: book.catalog?.genres?.length ? book.catalog.genres : [],
    language: book.catalog?.language || null,
    year: book.catalog?.year || null,
    pages: totalPages || book.totalPages || null,
  };
}

export default function RatingSheet({ visible, book, totalPages, onClose, onChanged }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [rating, setRating] = useState(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState('');
  const [disliked, setDisliked] = useState('');
  const [review, setReview] = useState('');

  const workId = book ? bookWorkId(book) : null;

  useEffect(() => {
    if (!visible || !workId) return;
    let alive = true;
    setError('');
    setMore(false);
    storage.getPersonal().then((p) => {
      if (!alive) return;
      const current = p.ratings[workId] || null;
      setRating(current);
      setLiked(current?.liked || '');
      setDisliked(current?.disliked || '');
      setReview(current?.review || '');
    }).catch(() => {
      if (alive) setRating(null);
    });
    return () => { alive = false; };
  }, [visible, workId]);

  if (!book) return null;

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      const next = await action();
      setRating(next.ratings[workId] || null);
      if (onChanged) onChanged(next);
    } catch {
      setError('Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const setStars = (stars) => {
    if (!stars) {
      run(() => storage.unrateWork(workId));
      return;
    }
    run(() => storage.rateWork({ ...ratingInfoFor(book, totalPages), stars }));
  };

  const toggleAspect = (key) => {
    const current = rating?.aspects?.[key];
    run(() => storage.rateDetails(workId, { aspects: { [key]: current ? null : true } }));
  };

  const setSurprise = (key) => {
    const current = rating?.aspects?.surprise;
    run(() => storage.rateDetails(workId, { aspects: { surprise: current === key ? null : key } }));
  };

  const saveTexts = () => run(() => storage.rateDetails(workId, { liked, disliked, review }));

  const remove = () => run(() => storage.unrateWork(workId));

  const stars = rating?.stars || 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.kicker}>Sua avaliação</Text>
                <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
              </View>
              <Touchable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Fechar avaliação">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Touchable>
            </View>

            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.starsBox}>
                <StarRating value={stars} onChange={busy ? undefined : setStars} size={38} gap={8} />
                <Text style={styles.hint}>{stars ? 'Toque na mesma estrela para remover a nota.' : 'Toque em uma estrela. Os detalhes abaixo são opcionais.'}</Text>
              </View>

              {stars > 0 && (
                <>
                  <Touchable style={styles.moreToggle} onPress={() => setMore((m) => !m)} accessibilityLabel="Mostrar detalhes opcionais">
                    <Text style={styles.moreText}>{more ? 'Esconder detalhes' : 'Adicionar detalhes'}</Text>
                    <Ionicons name={more ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
                  </Touchable>

                  {more && (
                    <View style={styles.details}>
                      <Text style={styles.label}>O que marcou você</Text>
                      <View style={styles.chips}>
                        {ASPECTS.map((a) => {
                          const on = !!rating?.aspects?.[a.key];
                          return (
                            <Touchable key={a.key} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleAspect(a.key)} accessibilityState={{ selected: on }}>
                              <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.label}</Text>
                            </Touchable>
                          );
                        })}
                        {SURPRISE.map((a) => {
                          const on = rating?.aspects?.surprise === a.key;
                          return (
                            <Touchable key={a.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setSurprise(a.key)} accessibilityState={{ selected: on }}>
                              <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.label}</Text>
                            </Touchable>
                          );
                        })}
                      </View>

                      <Text style={styles.label}>O que mais gostou</Text>
                      <TextInput style={styles.input} value={liked} onChangeText={setLiked} onBlur={saveTexts} placeholder="Opcional" placeholderTextColor={colors.textMuted} maxLength={300} />
                      <Text style={styles.label}>O que menos gostou</Text>
                      <TextInput style={styles.input} value={disliked} onChangeText={setDisliked} onBlur={saveTexts} placeholder="Opcional" placeholderTextColor={colors.textMuted} maxLength={300} />
                      <Text style={styles.label}>Resenha curta</Text>
                      <TextInput style={[styles.input, styles.multiline]} value={review} onChangeText={setReview} onBlur={saveTexts} placeholder="Opcional" placeholderTextColor={colors.textMuted} multiline maxLength={800} />
                    </View>
                  )}
                </>
              )}

              {!!error && <Text style={styles.error}>{error}</Text>}
            </ScrollView>

            <View style={styles.footer}>
              {stars > 0 && (
                <Touchable style={styles.removeBtn} onPress={remove} accessibilityLabel="Remover avaliação">
                  <Text style={styles.removeText}>Remover nota</Text>
                </Touchable>
              )}
              <Touchable style={styles.doneBtn} onPress={async () => { await saveTexts().catch(() => {}); onClose(); }} accessibilityLabel="Concluir avaliação">
                <Text style={styles.doneText}>{stars ? 'Concluir' : 'Agora não'}</Text>
              </Touchable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md, marginBottom: space.lg },
  headerText: { flex: 1, gap: 2 },
  kicker: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  title: { fontSize: 19, lineHeight: 25, color: colors.text, fontFamily: fonts.heading },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  scroll: { flexGrow: 0 },
  starsBox: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  moreToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 },
  moreText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  details: { gap: space.sm, paddingBottom: space.md },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill || 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextOn: { color: colors.onPrimary, fontWeight: '700' },
  input: { minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: space.md, fontSize: 14, color: colors.text },
  multiline: { minHeight: 80, paddingTop: 10, textAlignVertical: 'top' },
  error: { fontSize: 12, color: colors.danger, marginTop: space.sm },
  footer: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  removeBtn: { flex: 1, minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 14, fontWeight: '700', color: colors.danger },
  doneBtn: { flex: 1, minHeight: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
});
