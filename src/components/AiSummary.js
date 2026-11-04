import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai } from '../services/ai';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function AiSummary({ chapter }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSummary(null);
    setError(null);
    setLoading(false);
  }, [chapter?.id]);

  if (!ai.isAvailable || !chapter?.content || chapter.content.trim().length < 80) return null;

  const handleSummarize = async () => {
    const chapterId = chapter.id;
    setLoading(true);
    setError(null);
    try {
      const text = await ai.summarizeChapter(chapter.title, chapter.content);
      if (chapterId === chapter.id) setSummary(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cardColor = colors.surfaceMuted;
  const textColor = colors.text;
  const mutedColor = colors.textSecondary;

  if (!summary && !loading && !error) {
    return (
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: cardColor }]}
        onPress={handleSummarize}
        activeOpacity={0.8}
        accessibilityLabel="Resumir capítulo com IA"
      >
        <Ionicons name="sparkles" size={15} color={colors.accentGold} />
        <Text style={[styles.pillText, { color: textColor }]}>Resumir capítulo com IA</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={15} color={colors.accentGold} />
        <Text style={[styles.title, { color: textColor }]}>Resumo por IA</Text>
        {!loading && (
          <TouchableOpacity
            onPress={() => {
              setSummary(null);
              setError(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fechar resumo"
          >
            <Ionicons name="close" size={18} color={mutedColor} />
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.body, { color: mutedColor, marginLeft: 10 }]}>Lendo o capítulo...</Text>
        </View>
      )}

      {error && !loading && (
        <View>
          <Text style={[styles.body, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity onPress={handleSummarize} style={styles.retry}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {summary && !loading && (
        <View>
          <Text style={[styles.body, { color: textColor }]}>{summary}</Text>
          <Text style={[styles.disclaimer, { color: mutedColor }]}>
            Gerado por IA a partir do texto do capítulo. Pode conter imprecisões.
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 16,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  disclaimer: {
    fontSize: 11,
    marginTop: 8,
  },
  retry: {
    alignSelf: 'flex-start',
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
