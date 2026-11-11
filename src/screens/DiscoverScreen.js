import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Touchable from '../components/Touchable';
import WorkRow from '../components/WorkRow';
import WorkDetail from '../components/WorkDetail';
import DiscoverFilters, { EMPTY_FILTERS, countFilters } from '../components/DiscoverFilters';
import { useToast } from '../components/Toast';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, layout, radius, space } from '../theme/tokens';
import { catalog } from '../services/catalogClient';
import { storage } from '../services/storage';
import { addWorkToLibrary, workIdOf } from '../services/libraryAdd';
import { DISCOVERY_PRESETS, pickPreset, presetRequest } from '../services/catalog/discovery';
import { normalize } from '../services/catalog/text';
import { dialog } from '../services/dialog';

const MODES = [
  { key: 'buscar', label: 'Buscar' },
  { key: 'explorar', label: 'Explorar' },
];

function mergeWorks(current, incoming) {
  const seen = new Set(current.map((w) => w.id));
  return [...current, ...incoming.filter((w) => !seen.has(w.id))];
}

function failureLine(statuses) {
  const failed = statuses.filter((s) => !s.ok);
  if (!failed.length) return null;
  return `Sem resposta de ${failed.map((s) => `${s.label} (${s.error})`).join(', ')}. As outras fontes continuam valendo.`;
}

export default function DiscoverScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toast = useToast();
  const [mode, setMode] = useState('buscar');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allFailed, setAllFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [exploring, setExploring] = useState(null);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [owned, setOwned] = useState({ ids: new Set(), titles: new Set() });
  const run = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([storage.getBooks(0).catch(() => []), storage.getChestBooks(0).catch(() => [])]).then(([shelf, chest]) => {
        if (!active) return;
        const all = [...shelf, ...chest];
        setOwned({ ids: new Set(all.map(workIdOf)), titles: new Set(all.map((b) => normalize(b.title))) });
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const isOwned = (work) => owned.ids.has(work.id) || owned.titles.has(normalize(work.title));

  const toSearchInput = (f, nextPage) => ({
    query: query.trim(),
    language: f.language,
    availability: f.availability,
    genre: f.genre,
    author: f.author.trim() || null,
    yearFrom: f.yearFrom ? Number(f.yearFrom) : null,
    yearTo: f.yearTo ? Number(f.yearTo) : null,
    page: nextPage,
  });

  const search = async (f = filters, nextPage = 1) => {
    const hasInput = query.trim() || f.author.trim() || f.genre;
    if (!hasInput) {
      toast.show('Digite um título, autor ou assunto, ou escolha um gênero nos filtros.', 'error');
      return;
    }
    const id = run.current + 1;
    run.current = id;
    setExploring(null);
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const outcome = await catalog.search(toSearchInput(f, nextPage));
      if (run.current !== id) return;
      setResults((prev) => (nextPage === 1 ? outcome.works : mergeWorks(prev, outcome.works)));
      setStatuses(outcome.statuses);
      setAllFailed(outcome.allFailed);
      setPage(nextPage);
      setSearched(true);
    } catch {
      if (run.current === id) setAllFailed(true);
    } finally {
      if (run.current === id) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const explore = async (preset, nextPage = 1, seed = Math.random()) => {
    const id = run.current + 1;
    run.current = id;
    setExploring({ preset, seed });
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const outcome = await catalog.browse(presetRequest(preset, nextPage, seed));
      if (run.current !== id) return;
      setResults((prev) => (nextPage === 1 ? outcome.works : mergeWorks(prev, outcome.works)));
      setStatuses(outcome.statuses);
      setAllFailed(outcome.allFailed);
      setPage(nextPage);
      setSearched(true);
    } catch {
      if (run.current === id) setAllFailed(true);
    } finally {
      if (run.current === id) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const surprise = () => explore(pickPreset(Math.random(), exploring ? [exploring.preset.id] : []), 1, Math.random());

  const applyFilters = (next) => {
    setFilters(next);
    setShowFilters(false);
    if (query.trim() || next.author.trim() || next.genre) search(next, 1);
  };

  const loadMore = () => (exploring ? explore(exploring.preset, page + 1, exploring.seed) : search(filters, page + 1));

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      const result = await addWorkToLibrary(selected);
      if (result.status === 'exists') {
        toast.show('Este livro já está na sua estante.');
      } else {
        setOwned((prev) => ({ ids: new Set(prev.ids).add(selected.id), titles: new Set(prev.titles).add(normalize(selected.title)) }));
        toast.show(result.text === 'downloading' ? 'Livro adicionado. Baixando o texto completo...' : 'Livro adicionado à estante.');
        result.download?.then((outcome) => {
          if (outcome === 'failed') {
            setOwned((prev) => {
              const titles = new Set(prev.titles);
              titles.delete(normalize(selected.title));
              const ids = new Set(prev.ids);
              ids.delete(selected.id);
              return { ids, titles };
            });
            dialog.alert('Livro não adicionado', `Não foi possível baixar o texto de "${selected.title}" agora. Tente de novo mais tarde.`);
          }
        });
      }
      setSelected(null);
    } catch {
      toast.show('Não foi possível adicionar o livro.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const filterCount = countFilters(filters);
  const notice = failureLine(statuses);
  const showResults = searched || loading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <Header subtitle="Descobrir" onProfilePress={() => navigation.navigate('Perfil')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>Descobrir livros</Text>
        <Text style={styles.lead}>Uma busca só em várias bibliotecas digitais, com os livros gratuitos primeiro.</Text>

        <View style={styles.segment} accessibilityRole="tablist">
          {MODES.map((m) => (
            <Touchable
              key={m.key}
              style={[styles.segBtn, mode === m.key && styles.segBtnActive]}
              onPress={() => setMode(m.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m.key }}
            >
              <Text style={[styles.segText, mode === m.key && styles.segTextActive]}>{m.label}</Text>
            </Touchable>
          ))}
        </View>

        {mode === 'buscar' ? (
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Título, autor ou assunto"
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                onSubmitEditing={() => search()}
                accessibilityLabel="Buscar livros"
              />
              {query.length > 0 && (
                <Touchable onPress={() => setQuery('')} accessibilityLabel="Limpar busca" hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Touchable>
              )}
            </View>
            <Touchable style={[styles.filterBtn, filterCount > 0 && styles.filterBtnOn]} onPress={() => setShowFilters(true)} accessibilityLabel={`Filtros${filterCount ? `, ${filterCount} ativos` : ''}`}>
              <Ionicons name="options-outline" size={20} color={filterCount > 0 ? colors.onPrimary : colors.primary} />
              {filterCount > 0 ? <Text style={styles.filterCount}>{filterCount}</Text> : null}
            </Touchable>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            <Touchable style={styles.surprise} onPress={surprise} accessibilityLabel="Surpreenda-me com uma descoberta">
              <Ionicons name="shuffle-outline" size={20} color={colors.onPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.surpriseTitle}>Surpreenda-me</Text>
                <Text style={styles.surpriseHint}>Sorteia um tema fora do óbvio e mostra livros gratuitos de verdade.</Text>
              </View>
            </Touchable>
            <View style={styles.presets}>
              {DISCOVERY_PRESETS.map((p) => (
                <Touchable
                  key={p.id}
                  style={[styles.preset, exploring?.preset.id === p.id && styles.presetActive]}
                  onPress={() => explore(p)}
                  accessibilityLabel={`${p.label}. ${p.hint}`}
                >
                  <Ionicons name={p.icon} size={20} color={colors.primary} />
                  <Text style={styles.presetLabel}>{p.label}</Text>
                  <Text style={styles.presetHint} numberOfLines={2}>{p.hint}</Text>
                </Touchable>
              ))}
            </View>
          </View>
        )}

        {exploring ? (
          <View style={styles.exploreHead}>
            <Ionicons name={exploring.preset.icon} size={16} color={colors.primary} />
            <Text style={styles.exploreTitle}>{exploring.preset.label}</Text>
          </View>
        ) : null}

        {notice && showResults && !allFailed ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={14} color={colors.warningText} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Consultando as bibliotecas...</Text>
          </View>
        ) : allFailed ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma fonte respondeu</Text>
            <Text style={styles.muted}>Verifique a conexão e tente de novo em instantes.</Text>
            <Touchable style={styles.retry} onPress={() => (exploring ? explore(exploring.preset) : search())}>
              <Text style={styles.retryText}>Tentar de novo</Text>
            </Touchable>
          </View>
        ) : showResults && results.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nada encontrado</Text>
            <Text style={styles.muted}>Tente outro termo, ou afrouxe os filtros de idioma, ano e disponibilidade.</Text>
          </View>
        ) : (
          <View>
            {results.map((work) => (
              <WorkRow key={work.id} work={work} onPress={setSelected} inLibrary={isOwned(work)} />
            ))}
            {results.length > 0 ? (
              <View style={styles.moreRow}>
                <Touchable style={styles.more} onPress={loadMore} disabled={loadingMore}>
                  {loadingMore ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.moreText}>Mostrar mais</Text>}
                </Touchable>
                {exploring ? (
                  <Touchable style={styles.more} onPress={() => explore(exploring.preset, 1, Math.random())}>
                    <Text style={styles.moreText}>Outro sorteio</Text>
                  </Touchable>
                ) : null}
              </View>
            ) : null}
            {!showResults && mode === 'buscar' ? (
              <Text style={styles.hint}>
                Resultados de Project Gutenberg, Open Library, Internet Archive, Wikisource e Google Books aparecem juntos, sem repetir a mesma obra.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <DiscoverFilters visible={showFilters} filters={filters} onApply={applyFilters} onClose={() => setShowFilters(false)} />
      <WorkDetail
        work={selected}
        visible={selected !== null}
        onClose={() => setSelected(null)}
        onAdd={handleAdd}
        inLibrary={selected ? isOwned(selected) : false}
        adding={adding}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: 120, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', gap: space.md },
  screenTitle: { fontSize: 22, color: colors.text, fontFamily: fonts.heading },
  lead: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: -6 },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceSoft, borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  segTextActive: { color: colors.onPrimary },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, minHeight: 44 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterCount: { position: 'absolute', top: 4, right: 6, fontSize: 10, fontWeight: '800', color: colors.onPrimary },
  surprise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
  },
  surpriseTitle: { fontSize: 16, color: colors.onPrimary, fontFamily: fonts.heading },
  surpriseHint: { fontSize: 12, color: colors.onPrimary, opacity: 0.9, lineHeight: 16 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preset: {
    flexGrow: 1,
    flexBasis: '46%',
    gap: 4,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    minHeight: 96,
  },
  presetActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  presetLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  presetHint: { fontSize: 11, color: colors.textSecondary, lineHeight: 15 },
  exploreHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exploreTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.heading },
  notice: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: space.sm, borderRadius: radius.sm, backgroundColor: colors.warningLight },
  noticeText: { flex: 1, fontSize: 11, color: colors.warningText, lineHeight: 15 },
  center: { alignItems: 'center', gap: 8, paddingVertical: space.xl },
  emptyTitle: { fontSize: 16, color: colors.text, fontFamily: fonts.heading },
  muted: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  retry: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  retryText: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },
  moreRow: { flexDirection: 'row', gap: 10, marginTop: space.md },
  more: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, textAlign: 'center', marginTop: space.lg },
});
