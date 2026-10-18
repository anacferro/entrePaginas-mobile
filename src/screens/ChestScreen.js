import React, { useState, useCallback } from 'react';
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
import BookCover from '../components/BookCover';
import LoadingView from '../components/LoadingView';
import EmptyView from '../components/EmptyView';
import ErrorView from '../components/ErrorView';
import { storage } from '../services/storage';
import { colors } from '../theme/colors';

export default function ChestScreen({ navigation }) {
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
      Alert.alert('Volume Restaurado', 'O livro retornou com sucesso para a sua estante.');
      loadChestData();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível restaurar o livro.');
    }
  };

  const handleDeletePermanently = (bookId) => {
    Alert.alert(
      'Excluir Definitivamente',
      'Tem certeza de que deseja apagar este volume do baú? Esta ação é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteBookPermanently(bookId);
            loadChestData();
          },
        },
      ]
    );
  };

  const handleRestoreAll = () => {
    if (chestBooks.length === 0) return;
    Alert.alert(
      'Restaurar Todos',
      'Deseja mover todos os volumes do baú de volta para a sua estante?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar Todos',
          onPress: async () => {
            await storage.restoreAllFromChest();
            Alert.alert('Sucesso', 'Todos os livros foram restaurados para a estante.');
            loadChestData();
          },
        },
      ]
    );
  };

  const handleEmptyChest = () => {
    if (chestBooks.length === 0) return;
    Alert.alert(
      'Esvaziar Baú',
      'Deseja apagar definitivamente todos os volumes guardados no baú? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Esvaziar Definitivamente',
          style: 'destructive',
          onPress: async () => {
            await storage.emptyChest();
            loadChestData();
          },
        },
      ]
    );
  };

  const filteredBooks = chestBooks.filter((b) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(query) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(query))
    );
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceSoft} />
      <Header
        subtitle="Baú Literário"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Global Batch Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.restoreAllBtn, chestBooks.length === 0 && styles.disabledBtn]}
            onPress={handleRestoreAll}
            disabled={chestBooks.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.restoreAllBtnText}>Restaurar Todos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.emptyChestBtn, chestBooks.length === 0 && styles.disabledBtn]}
            onPress={handleEmptyChest}
            disabled={chestBooks.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyChestBtnText}>Esvaziar Baú</Text>
          </TouchableOpacity>
        </View>

        {/* Listing States: Loading, Error, Empty, Grid */}
        {loading && <LoadingView message="Abrindo o baú literário..." />}

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
              <View key={book.id} style={styles.cardContainer}>
                <BookCover
                  title={book.title}
                  coverColor={book.coverColor}
                  titleColor={book.titleColor}
                  totalPages={book.totalPages}
                  size="medium"
                />

                {/* Chest card actions matching Figma */}
                <View style={styles.cardButtonsRow}>
                  <TouchableOpacity
                    style={styles.restoreBookBtn}
                    activeOpacity={0.8}
                    onPress={() => handleRestoreOne(book.id)}
                  >
                    <Ionicons name="arrow-up" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.restoreBookBtnText}>Restaurar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBookBtn}
                    activeOpacity={0.8}
                    onPress={() => handleDeletePermanently(book.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'serif',
    marginBottom: 14,
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
    color: '#FFFFFF',
  },
  emptyChestBtn: {
    backgroundColor: colors.accentPeach,
  },
  emptyChestBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    backgroundColor: '#6A372E',
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  restoreBookBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteBookBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3D2C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
