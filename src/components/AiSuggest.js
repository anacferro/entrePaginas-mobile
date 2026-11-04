import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai } from '../services/ai';
import { colors } from '../theme/colors';

export default function AiSuggest({ title, text, onApply }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  if (!ai.isAvailable) return null;

  const canAsk = title.trim().length > 0 || text.trim().length > 0;

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      setSuggestion(await ai.suggestMetadata(title, text));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    onApply(suggestion);
    setSuggestion(null);
  };

  return (
    <View style={styles.box}>
      <TouchableOpacity
        style={[styles.button, (!canAsk || loading) && styles.buttonDisabled]}
        onPress={handleSuggest}
        disabled={!canAsk || loading}
        activeOpacity={0.8}
        accessibilityLabel="Sugerir categoria e etiquetas com IA"
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="sparkles" size={15} color={colors.accentGold} />
        )}
        <Text style={styles.buttonText}>{loading ? 'Analisando...' : 'Sugerir categoria e etiquetas com IA'}</Text>
      </TouchableOpacity>

      {error && !loading && (
        <View style={styles.result}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {suggestion && !loading && (
        <View style={styles.result}>
          {suggestion.category && (
            <Text style={styles.line}>
              <Text style={styles.label}>Categoria: </Text>
              {suggestion.category}
            </Text>
          )}
          {suggestion.tags && (
            <Text style={styles.line}>
              <Text style={styles.label}>Etiquetas: </Text>
              {suggestion.tags.join(', ')}
            </Text>
          )}
          {suggestion.synopsis && (
            <Text style={styles.line}>
              <Text style={styles.label}>Resumo curto: </Text>
              {suggestion.synopsis}
            </Text>
          )}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} accessibilityLabel="Aplicar sugestão">
              <Text style={styles.applyText}>Aplicar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSuggestion(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.discardText}>Descartar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>Gerado por IA. Confira antes de aplicar.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  result: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3EBDD',
  },
  line: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  label: {
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
  },
  applyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  discardText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
