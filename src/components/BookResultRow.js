import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';

function Thumb({ uri, styles, color }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[styles.thumb, styles.thumbEmpty]}>
        <Ionicons name="book-outline" size={18} color={color} />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.thumb} onError={() => setFailed(true)} />;
}

export default function BookResultRow({ book, onPress }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Touchable
      style={styles.resultRow}
      onPress={() => onPress(book)}
      activeOpacity={0.7}
      accessibilityLabel={`Adicionar ${book.title}`}
    >
      <Thumb uri={book.thumbnail} styles={styles} color={colors.textMuted} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {[book.authors, book.language, book.pageCount && `${book.pageCount}p`].filter(Boolean).join(' • ') || 'Autor não informado'}
        </Text>
      </View>
      <Ionicons name="add-circle" size={26} color={colors.primary} />
    </Touchable>
  );
}

const createStyles = (colors) => StyleSheet.create({
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
