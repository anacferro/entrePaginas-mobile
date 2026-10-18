import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import BookCard from '../components/BookCard';
import LoadingView from '../components/LoadingView';
import EmptyView from '../components/EmptyView';
import ErrorView from '../components/ErrorView';
import { storage } from '../services/storage';
import { colors } from '../theme/colors';

export default function BookshelfScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [chestCount, setChestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent' | 'az' | 'pages'

  const loadData = async (isPullRefresh = false) => {
    try {
      if (!isPullRefresh) setLoading(true);
      setError(null);

      const [booksData, chestData] = await Promise.all([
        storage.getBooks(isPullRefresh ? 200 : 350),
        storage.getChestBooks(0),
      ]);

      setBooks(booksData);
      setChestCount(chestData.length);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleBookPress = (book) => {
    // Navigation with parameter passing to ReaderScreen
    navigation.navigate('Reader', {
      bookId: book.id,
      bookTitle: book.title,
    });
  };

  const handleMoveToChest = async (bookId) => {
    try {
      await storage.moveToChest(bookId);
      Alert.alert('Volume Guardado', 'O livro foi transferido com segurança para o Baú Literário.');
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível mover o livro para o baú.');
    }
  };

  const handleDeleteBook = (bookId) => {
    Alert.alert(
      'Excluir Definitivamente',
      'Deseja remover este livro permanentemente da sua biblioteca?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteBookPermanently(bookId);
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

  // Filter and sort
  const filteredBooks = books
    .filter((b) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(query) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(query)) ||
        (b.category && b.category.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'az') return a.title.localeCompare(b.title);
      if (sortOrder === 'pages') return b.totalPages - a.totalPages;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceSoft} />
      <Header
        subtitle="Estante"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Section: Sua Coleção */}
        <View style={styles.collectionHeaderRow}>
          <Text style={styles.collectionTitle}>Sua Coleção</Text>
          <View style={styles.cloudBadge}>
            <Ionicons name="cloud-outline" size={13} color={colors.primary} />
            <Text style={styles.cloudBadgeText}>Firebase Ativo</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título, autor ou etiqueta..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={toggleSort}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Action Banners */}
        <View style={styles.bannersRow}>
          {/* Card: Baú Literário */}
          <TouchableOpacity
            style={styles.chestBanner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Bau')}
          >
            <View style={styles.bannerTopRow}>
              <View style={styles.chestIconSquare}>
                <Ionicons name="archive" size={16} color={colors.secondary} />
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterPillText}>{chestCount} guardados</Text>
              </View>
            </View>
            <Text style={styles.bannerTitle}>Baú Literário</Text>
            <Text style={styles.bannerSubtitle}>Volumes em descanso</Text>
          </TouchableOpacity>

          {/* Card: Novo Livro */}
          <TouchableOpacity
            style={styles.newBookBanner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CriarObra', { initialTab: 'create' })}
          >
            <View style={styles.bannerTopRow}>
              <View style={styles.newBookIconSquare}>
                <Ionicons name="book" size={16} color="#FFFFFF" />
              </View>
              <Ionicons name="add" size={20} color="#FFFFFF" opacity={0.8} />
            </View>
            <Text style={[styles.bannerTitle, { color: '#FFFFFF' }]}>Novo Livro</Text>
            <Text style={[styles.bannerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
              Criar encadernação
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: Minha Estante */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithCount}>
            <Text style={styles.sectionTitle}>Minha Estante</Text>
            <Text style={styles.volumeCountText}>{books.length} volumes</Text>
          </View>
          <TouchableOpacity style={styles.sortButton} onPress={toggleSort} activeOpacity={0.7}>
            <Text style={styles.sortButtonText}>
              Organizar {sortOrder === 'az' ? 'A-Z' : sortOrder === 'pages' ? 'Páginas' : 'Recentes'}
            </Text>
            <Ionicons name="swap-vertical" size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Listing State Handling: Loading, Error, Empty, List */}
        {loading && <LoadingView message="Organizando as prateleiras da estante..." />}

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
                onDelete={handleDeleteBook}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'serif',
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  cloudBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  filterButton: {
    padding: 4,
  },
  bannersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  chestBanner: {
    flex: 1,
    backgroundColor: '#FAF5EE',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  newBookBanner: {
    flex: 1,
    backgroundColor: '#82745B',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chestIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  newBookIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterPill: {
    backgroundColor: '#EFE7DC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontFamily: 'serif',
  },
  volumeCountText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
