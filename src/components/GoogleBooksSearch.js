import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { googleBooks } from '../services/googleBooks';
import { publicDomain } from '../services/publicDomain';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';
import { fieldStyles } from './FormBlocks';

export default function GoogleBooksSearch({ onSelect }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const found = await googleBooks.search(query);
      const checked = await Promise.all(
        found.slice(0, 15).map(async (book) => {
          const entry = await publicDomain.findEntry(book.title, book.authors);
          return entry ? { ...book, gutenbergId: entry.id } : null;
        })
      );
      const seen = new Set();
      setResults(
        checked.filter((book) => {
          if (!book || seen.has(book.gutenbergId)) return false;
          seen.add(book.gutenbergId);
          return true;
        })
      );
    } catch (e) {
      setResults(null);
      setError(e.message || 'Não foi possível consultar o Google Books.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (book) => {
    onSelect(book);
    setResults(null);
    setQuery('');
  };

  return (
    <View style={styles.formCard}>
      <View style={styles.cardHeaderWithMeta}>
        <View style={styles.cardHeader}>
          <Ionicons name="search-outline" size={18} color={colors.primary} />
          <Text style={styles.cardHeaderTitle}>Buscar no Google Books</Text>
        </View>
        <Text style={styles.metaLabel}>Só obras com texto completo</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Título ou autor..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          accessibilityLabel="Buscar no Google Books"
        />
        <Touchable
          style={[styles.searchButton, (!query.trim() || loading) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!query.trim() || loading}
          activeOpacity={0.8}
          accessibilityLabel="Buscar"
        >
          <Ionicons name="search" size={18} color={colors.onPrimary} />
        </Touchable>
      </View>

      {loading && (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Procurando obras com texto completo...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.stateBox}>
          <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
          <Text style={styles.stateText}>{error}</Text>
          <Touchable onPress={handleSearch} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Touchable>
        </View>
      )}

      {results && results.length === 0 && !loading && (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Nenhuma obra com texto completo para essa busca. Só livros de domínio público podem ser adicionados por aqui.</Text>
        </View>
      )}

      {results && !loading && results.map((book) => (
        <Touchable
          key={book.id}
          style={styles.resultRow}
          onPress={() => handleSelect(book)}
          activeOpacity={0.7}
          accessibilityLabel={`Adicionar ${book.title}`}
        >
          {book.thumbnail ? (
            <Image source={{ uri: book.thumbnail }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Ionicons name="book-outline" size={18} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.resultInfo}>
            <Text style={styles.resultTitle} numberOfLines={2}>{book.title}</Text>
            <Text style={styles.resultMeta} numberOfLines={1}>
              {[book.authors, book.pageCount && `${book.pageCount}p`].filter(Boolean).join(' • ') || 'Autor não informado'}
            </Text>
          </View>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </Touchable>
      ))}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeaderWithMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginLeft: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    ...fieldStyles(colors).input,
    flex: 1,
  },
  searchButton: {
    marginLeft: 8,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.45,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  stateText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 8,
  },
  thumb: {
    width: 40,
    height: 58,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  resultMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
