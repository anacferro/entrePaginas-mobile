import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { googleBooks, isSearchable, singleLetter } from '../services/googleBooks';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';
import BookResultRow from './BookResultRow';
import CatalogModal from './CatalogModal';
import { fieldStyles } from './FormBlocks';
import { fonts } from '../theme/tokens';

export default function GoogleBooksSearch({ onSelect }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const searchable = isSearchable(query);

  const handleSearch = async () => {
    if (!searchable || loading) return;
    const letter = singleLetter(query);
    if (letter) {
      setCatalog({ letter });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResults(await googleBooks.search(query));
    } catch (e) {
      setResults(null);
      setError(e.message || 'Não foi possível consultar o Google Books.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (book) => {
    setCatalog(null);
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
        <Touchable
          onPress={() => setCatalog({ letter: null })}
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
          accessibilityLabel="Abrir catálogo de A a Z"
        >
          <Text style={styles.catalogLink}>Catálogo A-Z</Text>
        </Touchable>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Título, autor ou uma letra..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          accessibilityLabel="Buscar no Google Books"
        />
        <Touchable
          style={[styles.searchButton, (!searchable || loading) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!searchable || loading}
          activeOpacity={0.8}
          accessibilityLabel="Buscar"
        >
          <Ionicons name="search" size={18} color={colors.onPrimary} />
        </Touchable>
      </View>

      {query.trim().length > 0 && !searchable && !loading && (
        <Text style={styles.hint}>Digite uma letra para ver as obras que começam com ela, ou uma palavra com 3 letras, como parte do título ou o nome do autor.</Text>
      )}

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
          <Text style={styles.stateText}>Nenhuma obra com texto completo para essa busca. Só livros de domínio público podem ser adicionados por aqui. Tente o nome do autor ou o título no idioma original.</Text>
        </View>
      )}

      {results && !loading && results.map((book) => (
        <BookResultRow key={book.id} book={book} onPress={handleSelect} />
      ))}

      {catalog && (
        <CatalogModal
          initialLetter={catalog.letter}
          onSelect={handleSelect}
          onClose={() => setCatalog(null)}
        />
      )}
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
    fontFamily: fonts.heading,
    marginLeft: 8,
  },
  catalogLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
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
});
