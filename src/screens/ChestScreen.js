import React, { useState, useCallback } from 'react';
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
import Header from '../components/Header';
import BookCover, { useShelfLayout, SHELF_MAX_WIDTH } from '../components/BookCover';
import { SkeletonShelf } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import EmptyView from '../components/EmptyView';
import ErrorView from '../components/ErrorView';
import { storage } from '../services/storage';
import { matchesQuery } from '../services/textSearch';
import { dialog } from '../services/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from '../components/Touchable';
import { fonts } from '../theme/tokens';

export default function ChestScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { coverWidth, cellWidth } = useShelfLayout();
  const toast = useToast();
  const [chestBooks, setChestBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadChestData = async (isPull = false) => {
    try {
      if (!isPull) setLoading(true);
      setError(null);
      const data = await storage.getChestBooks(isPull ? 200 : 350);
      setChestBooks(data);
    } catch (err) {
      setError(err.message || 'Falha ao acessar os arquivos do baú.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChestData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadChestData(true);
  };

  const handleRestoreOne = async (bookId) => {
    try {
      await storage.restoreFromChest(bookId);
      toast.show('Livro restaurado para a estante.');
      loadChestData();
    } catch {
      toast.show('Não foi possível restaurar o livro. Tente de novo.', 'error');
    }
  };

  const handleDeletePermanently = (bookId) => {
    dialog.alert(
      'Excluir Definitivamente',
      'Tem certeza de que deseja apagar este volume do baú? Esta ação é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteBookPermanently(bookId);
            toast.show('Livro excluído.');
            loadChestData();
          },
        },
      ]
    );
  };

  const handleRestoreAll = () => {
    if (chestBooks.length === 0) return;
    dialog.alert(
      'Restaurar Todos',
      'Deseja mover todos os volumes do baú de volta para a sua estante?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar Todos',
          onPress: async () => {
            await storage.restoreAllFromChest();
            toast.show('Todos os livros voltaram para a estante.');
            loadChestData();
          },
        },
      ]
    );
  };

  const handleEmptyChest = () => {
    if (chestBooks.length === 0) return;
    dialog.alert(
      'Esvaziar Baú',
      'Deseja apagar definitivamente todos os volumes guardados no baú? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Esvaziar Definitivamente',
          style: 'destructive',
          onPress: async () => {
            await storage.emptyChest();
            toast.show('Baú esvaziado.');
            loadChestData();
          },
        },
      ]
    );
  };

  const filteredBooks = chestBooks.filter(b => matchesQuery(searchQuery, [b.title, b.subtitle, b.category]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <Header
        subtitle="Baú Literário"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.secondary]}
            tintColor={colors.secondary}
          />
        }
      >
        <Text style={styles.screenTitle}>Baú de Livros</Text>

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

        <View style={styles.actionRow}>
          <Touchable
            style={[styles.actionBtn, styles.restoreAllBtn, chestBooks.length === 0 && styles.disabledBtn]}
            onPress={handleRestoreAll}
            disabled={chestBooks.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.restoreAllBtnText}>Restaurar Todos</Text>
          </Touchable>

          <Touchable
            style={[styles.actionBtn, styles.emptyChestBtn, chestBooks.length === 0 && styles.disabledBtn]}
            onPress={handleEmptyChest}
            disabled={chestBooks.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyChestBtnText}>Esvaziar Baú</Text>
          </Touchable>
        </View>

        {loading && <SkeletonShelf count={4} />}

        {!loading && error && (
          <ErrorView
            title="Falha ao carregar o baú"
            message={error}
            onRetry={() => loadChestData()}
          />
        )}

        {!loading && !error && filteredBooks.length === 0 && (
          <EmptyView
            icon="archive-outline"
            title={searchQuery ? 'Nenhum livro encontrado no baú' : 'O baú está vazio'}
            description={
              searchQuery
                ? `Nenhum volume corresponde a "${searchQuery}".`
                : 'Quando você retirar livros da estante, eles ficarão guardados em descanso aqui com segurança.'
            }
            actionLabel="Ver Estante"
            onActionPress={() => navigation.navigate('Estante')}
          />
        )}

        {!loading && !error && filteredBooks.length > 0 && (
          <View style={styles.booksGrid}>
            {filteredBooks.map((book) => (
              <View key={book.id} style={[styles.cardContainer, { width: cellWidth }]}>
                <BookCover
                  title={book.title}
                  coverColor={book.coverColor}
                  titleColor={book.titleColor}
                  totalPages={book.totalPages}
                  coverImage={book.coverImage}
                  width={coverWidth}
                  size="medium"
                />

                <View style={[styles.cardButtonsRow, { width: coverWidth }]}>
                  <Touchable
                    style={styles.restoreBookBtn}
                    activeOpacity={0.8}
                    onPress={() => handleRestoreOne(book.id)}
                  >
                    <Ionicons name="arrow-up" size={13} color={colors.onPrimary} style={{ marginRight: 4 }} />
                    <Text style={styles.restoreBookBtnText}>Restaurar</Text>
                  </Touchable>

                  <Touchable
                    style={styles.deleteBookBtn}
                    activeOpacity={0.8}
                    onPress={() => handleDeletePermanently(book.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Touchable>
                </View>
              </View>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledBtn: {
    opacity: 0.45,
  },
  restoreAllBtn: {
    backgroundColor: colors.primary,
  },
  restoreAllBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  emptyChestBtn: {
    backgroundColor: colors.secondary,
  },
  emptyChestBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cardContainer: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 22,
  },
  cardButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 155,
    marginTop: 10,
    gap: 6,
  },
  restoreBookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  restoreBookBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onDark,
  },
  deleteBookBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
