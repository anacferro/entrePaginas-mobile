import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { googleBooks, BROWSE_LANGUAGES } from '../services/googleBooks';
import { letterKey } from '../services/publicDomain';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';
import BookResultRow from './BookResultRow';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

function Chip({ label, active, onPress, styles }) {
  return (
    <Touchable style={[styles.chip, active && styles.chipActive]} onPress={onPress} accessibilityLabel={label}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Touchable>
  );
}

export default function CatalogModal({ initialLetter, onSelect, onClose }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [letter, setLetter] = useState(initialLetter || null);
  const [language, setLanguage] = useState('pt');
  const [mode, setMode] = useState('alphabetical');
  const [state, setState] = useState({ books: [], cursor: undefined, hasMore: true, loading: true, error: null });
  const requestId = useRef(0);

  const load = useCallback(async (lang, wanted, cursor, popular) => {
    const id = ++requestId.current;
    const reset = cursor === undefined;
    setState(s => ({ ...(reset ? { books: [], cursor: undefined, hasMore: true } : s), loading: true, error: null }));
    try {
      const page = await googleBooks.browse(lang, wanted, cursor, popular);
      if (id !== requestId.current) return;
      setState(s => ({
        books: reset ? page.books : [...s.books, ...page.books.filter(b => !s.books.some(o => o.id === b.id))],
        cursor: page.cursor,
        hasMore: page.hasMore,
        loading: false,
        error: null,
      }));
    } catch {
      if (id !== requestId.current) return;
      setState(s => ({ ...s, loading: false, error: 'Não foi possível carregar o catálogo. Verifique a conexão.' }));
    }
  }, []);

  const popular = mode === 'popular';

  useEffect(() => {
    load(language, popular ? null : letter, undefined, popular);
  }, [language, letter, popular, load]);

  const loadMore = () => {
    if (state.loading || !state.hasMore || state.error) return;
    load(language, popular ? null : letter, state.cursor, popular);
  };

  const changeLanguage = async (code) => {
    if (code === language) return;
    requestId.current += 1;
    setState({ books: [], cursor: undefined, hasMore: true, loading: true, error: null });
    const next = await googleBooks.catalogMode(code);
    setMode(next);
    if (next === 'popular') setLetter(null);
    setLanguage(code);
  };

  const { books, loading, error, hasMore } = state;

  const renderItem = ({ item, index }) => {
    const current = letterKey(item.title);
    const showLetter = !popular && !letter && (index === 0 || letterKey(books[index - 1].title) !== current);
    return (
      <View>
        {showLetter && <Text style={styles.letterHeader}>{current}</Text>}
        <BookResultRow book={item} onPress={onSelect} />
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <Touchable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Fechar catálogo">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Touchable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>Catálogo de A a Z</Text>
              <Text style={styles.subtitle}>Obras de domínio público com texto completo</Text>
            </View>
          </View>

          <View style={styles.filters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {BROWSE_LANGUAGES.map(item => (
                <Chip key={item.code} label={item.label} active={language === item.code} onPress={() => changeLanguage(item.code)} styles={styles} />
              ))}
            </ScrollView>
            {popular ? (
              <Text style={styles.note}>
                Este idioma tem obras demais para listar de A a Z. Mostrando as mais baixadas; para outras, use a busca por título ou autor.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="Todas" active={letter === null} onPress={() => setLetter(null)} styles={styles} />
                {LETTERS.map(item => (
                  <Chip key={item} label={item} active={letter === item} onPress={() => setLetter(item)} styles={styles} />
                ))}
              </ScrollView>
            )}
          </View>

          <FlatList
            style={{ flex: 1 }}
            contentContainerStyle={styles.list}
            data={books}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              !loading && !error ? (
                <Text style={styles.stateText}>Nenhuma obra {letter ? `com a letra ${letter} ` : ''}neste idioma.</Text>
              ) : null
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {loading && <ActivityIndicator color={colors.primary} />}
                {error && !loading && (
                  <>
                    <Text style={styles.stateText}>{error}</Text>
                    <Touchable style={styles.retry} onPress={() => load(language, popular ? null : letter, books.length ? state.cursor : undefined, popular)}>
                      <Text style={styles.retryText}>Tentar novamente</Text>
                    </Touchable>
                  </>
                )}
                {!loading && !error && !hasMore && books.length > 0 && (
                  <Text style={styles.stateText}>{popular ? 'Fim da lista.' : letter ? `Fim da letra ${letter}.` : 'Fim do catálogo.'}</Text>
                )}
              </View>
            }
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  filters: { paddingTop: 10, gap: 8 },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  note: { paddingHorizontal: 16, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  letterHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 16,
  },
  footer: { alignItems: 'center', paddingVertical: 20 },
  stateText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  retry: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
