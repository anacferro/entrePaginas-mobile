import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { importProgress } from '../services/importProgress';
import { resumePendingTexts } from '../services/googleImport';
import Header from '../components/Header';
import BookCard from '../components/BookCard';
import { SkeletonShelf } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { withPageCounts } from '../services/bookPages';
import { progressOf, STATUS, STATUS_LABELS } from '../services/readingStats';
import EmptyView from '../components/EmptyView';
import ErrorView from '../components/ErrorView';
import { storage } from '../services/storage';
import { matchesQuery } from '../services/textSearch';
import { exporter } from '../services/exporter';
import { biometrics } from '../services/biometrics';
import { dialog } from '../services/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from '../components/Touchable';
import { fonts } from '../theme/tokens';
import { SHELF_MAX_WIDTH } from '../components/BookCover';

export default function BookshelfScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toast = useToast();
  const [books, setBooks] = useState([]);
  const [reading, setReading] = useState({ positions: {}, log: { books: {} } });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('recent');
  const [selectedIds, setSelectedIds] = useState([]);
  const selecting = selectedIds.length > 0;
  const [, setTick] = useState(0);

  const loadData = async (isPullRefresh = false) => {
    try {
      if (!isPullRefresh) setLoading(true);
      setError(null);

      const [booksData, readingData] = await Promise.all([
        storage.getBooks(isPullRefresh ? 200 : 350),
        storage.getReadingOverview(),
      ]);

      setBooks(withPageCounts(booksData));
      setReading(readingData);
      resumePendingTexts(booksData);
    } catch (err) {
      setError(err.message || 'Falha ao carregar volumes da estante.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(
    () =>
      importProgress.subscribe((type) => {
        if (type === 'finish') loadData(true);
        else setTick(n => n + 1);
      }),
    []
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleBookPress = async (book) => {
    if (importProgress.get(book.id)) {
      dialog.alert('Carregando', 'O texto deste livro ainda está sendo baixado. Em instantes ele fica disponível para leitura.');
      return;
    }
    if (book.locked && !(await biometrics.unlock(book.title))) return;
    navigation.navigate('Reader', {
      bookId: book.id,
      bookTitle: book.title,
    });
  };

  const handleMoveToChest = async (bookId) => {
    try {
      await storage.moveToChest(bookId);
      toast.show('Livro guardado no Baú Literário.');
      loadData();
    } catch {
      toast.show('Não foi possível mover o livro para o baú. Tente de novo.', 'error');
    }
  };

  const handleEditBook = async (bookId, updates) => {
    try {
      await storage.updateBook(bookId, updates);
      toast.show('Alterações salvas.');
      loadData();
    } catch {
      toast.show('Não foi possível salvar as alterações. Tente de novo.', 'error');
    }
  };

  const handleToggleLock = async (book) => {
    const confirmed = book.locked
      ? await biometrics.unlock(book.title)
      : await biometrics.confirmToProtect(book.title);
    if (!confirmed) return;

    try {
      await storage.setBookLocked(book.id, !book.locked);
      toast.show(book.locked ? 'Proteção removida.' : 'Livro protegido.');
      loadData();
    } catch {
      toast.show('Não foi possível alterar a proteção do livro.', 'error');
    }
  };

  const handleExportBook = async (book, format) => {
    if (book.locked && !(await biometrics.unlock(book.title))) return;
    try {
      await exporter.exportBook(book, format);
    } catch (e) {
      toast.show(e.message || 'Não foi possível exportar o livro. Tente de novo.', 'error');
    }
  };

  const handleDeleteBook = (bookId) => {
    dialog.alert(
      'Excluir Definitivamente',
      'Deseja remover este livro permanentemente da sua biblioteca?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteBookPermanently(bookId);
            toast.show('Livro excluído.');
            loadData();
          },
        },
      ]
    );
  };

  const toggleSelected = (bookId) => {
    setSelectedIds(prev => (prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]));
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.length;
    dialog.alert(
      'Excluir livros',
      `Deseja remover ${count} ${count === 1 ? 'livro' : 'livros'} permanentemente da sua biblioteca?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteBooksPermanently(selectedIds);
            toast.show(count === 1 ? 'Livro excluído.' : `${count} livros excluídos.`);
            setSelectedIds([]);
            loadData();
          },
        },
      ]
    );
  };

  const toggleSort = () => {
    if (sortOrder === 'recent') setSortOrder('az');
    else if (sortOrder === 'az') setSortOrder('pages');
    else setSortOrder('recent');
  };

  const progressById = useMemo(() => {
    const map = {};
    books.forEach((b) => {
      map[b.id] = progressOf(b, reading.positions[b.id] || 1, reading.log.books[b.id]);
    });
    return map;
  }, [books, reading]);

  const statusCounts = useMemo(() => {
    const counts = { all: books.length, [STATUS.READING]: 0, [STATUS.PLANNED]: 0, [STATUS.FINISHED]: 0, [STATUS.ABANDONED]: 0 };
    books.forEach((b) => { counts[progressById[b.id].status] += 1; });
    return counts;
  }, [books, progressById]);

  const filteredBooks = books
    .filter(b => statusFilter === 'all' || progressById[b.id].status === statusFilter)
    .filter(b => matchesQuery(searchQuery, [b.title, b.subtitle, b.category, ...(b.tags || [])]))
    .sort((a, b) => {
      if (sortOrder === 'az') return a.title.localeCompare(b.title);
      if (sortOrder === 'pages') return b.totalPages - a.totalPages;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <Header
        subtitle="Estante"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.collectionHeaderRow}>
          <Text style={styles.collectionTitle}>Sua Coleção</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título ou categoria..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Touchable
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Limpar busca"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Touchable>
          )}
        </View>

        {!selecting && books.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {[
              { key: 'all', label: 'Todos' },
              { key: STATUS.READING, label: STATUS_LABELS[STATUS.READING] },
              { key: STATUS.PLANNED, label: STATUS_LABELS[STATUS.PLANNED] },
              { key: STATUS.FINISHED, label: STATUS_LABELS[STATUS.FINISHED] },
              { key: STATUS.ABANDONED, label: STATUS_LABELS[STATUS.ABANDONED] },
            ].map((item) => (
              <Touchable
                key={item.key}
                style={[styles.filterChip, statusFilter === item.key && styles.filterChipOn]}
                onPress={() => setStatusFilter(item.key)}
                accessibilityState={{ selected: statusFilter === item.key }}
              >
                <Text style={[styles.filterText, statusFilter === item.key && styles.filterTextOn]}>
                  {item.label} {statusCounts[item.key]}
                </Text>
              </Touchable>
            ))}
          </ScrollView>
        )}

        {selecting ? (
          <View style={styles.selectionBar}>
            <Touchable style={styles.selectionIcon} onPress={() => setSelectedIds([])} accessibilityLabel="Cancelar seleção">
              <Ionicons name="close" size={20} color={colors.text} />
            </Touchable>
            <Text style={styles.selectionCount}>
              {selectedIds.length} {selectedIds.length === 1 ? 'selecionado' : 'selecionados'}
            </Text>
            <Touchable
              style={styles.selectionAll}
              onPress={() => setSelectedIds(filteredBooks.map(b => b.id))}
              accessibilityLabel="Selecionar todos"
            >
              <Text style={styles.selectionAllText}>Todos</Text>
            </Touchable>
            <Touchable style={styles.selectionDelete} onPress={handleDeleteSelected} accessibilityLabel="Excluir selecionados">
              <Ionicons name="trash-outline" size={18} color="#FAF8F1" />
              <Text style={styles.selectionDeleteText}>Excluir</Text>
            </Touchable>
          </View>
        ) : (
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithCount}>
            <Text style={styles.sectionTitle}>Minha Estante</Text>
            <Text style={styles.volumeCountText}>
              {books.length} {books.length === 1 ? 'volume' : 'volumes'}
            </Text>
          </View>
          <Touchable style={styles.sortButton} onPress={toggleSort} activeOpacity={0.7}>
            <Text style={styles.sortButtonText}>
              Organizar {sortOrder === 'az' ? 'A-Z' : sortOrder === 'pages' ? 'Páginas' : 'Recentes'}
            </Text>
            <Ionicons name="swap-vertical" size={15} color={colors.textSecondary} />
          </Touchable>
        </View>
        )}

        {loading && <SkeletonShelf />}

        {!loading && error && (
          <ErrorView
            title="Não foi possível exibir sua estante"
            message={error}
            onRetry={() => loadData()}
          />
        )}

        {!loading && !error && filteredBooks.length === 0 && (
          <EmptyView
            icon="library-outline"
            title={searchQuery ? 'Nenhum resultado encontrado' : 'Sua estante está vazia'}
            description={
              searchQuery
                ? `Nenhum volume corresponde aos termos "${searchQuery}".`
                : 'Você ainda não possui livros ativos na estante. Crie sua primeira obra do zero ou restaure do baú.'
            }
            actionLabel={searchQuery ? 'Limpar Busca' : 'Criar Primeiro Livro'}
            onActionPress={() => {
              if (searchQuery) setSearchQuery('');
              else navigation.navigate('CriarObra', { initialTab: 'create' });
            }}
          />
        )}

        {!loading && !error && filteredBooks.length > 0 && (
          <View style={styles.booksGrid}>
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onPress={handleBookPress}
                onMoveToChest={handleMoveToChest}
                onEdit={handleEditBook}
                onExport={handleExportBook}
                onToggleLock={handleToggleLock}
                onDelete={handleDeleteBook}
                progress={importProgress.get(book.id)}
                reading={progressById[book.id]}
                selecting={selecting}
                selected={selectedIds.includes(book.id)}
                onLongPress={toggleSelected}
                onToggle={toggleSelected}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    width: '100%',
    maxWidth: SHELF_MAX_WIDTH,
    alignSelf: 'center',
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 14,
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  filterTextOn: {
    color: colors.onPrimary,
  },
  collectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  collectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitleWithCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
  },
  volumeCountText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  sortButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  selectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCount: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  selectionAll: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  selectionDelete: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionDeleteText: {
    color: '#FAF8F1',
    fontSize: 13,
    fontWeight: '700',
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});
