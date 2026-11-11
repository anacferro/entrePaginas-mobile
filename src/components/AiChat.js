import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import Touchable from './Touchable';

export default function AiChat({ messages, busy, error, onSend, onSource, placeholder, suggestions = [], emptyHint }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [input, setInput] = useState('');
  const scroll = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages.length, busy]);

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    setInput('');
    onSend(value);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView ref={scroll} style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && !busy && (
          <View style={styles.empty}>
            {emptyHint ? <Text style={styles.emptyText}>{emptyHint}</Text> : null}
            <View style={styles.chips}>
              {suggestions.map((s) => (
                <Touchable key={s} style={styles.chip} onPress={() => send(s)} accessibilityLabel={s}>
                  <Text style={styles.chipText}>{s}</Text>
                </Touchable>
              ))}
            </View>
          </View>
        )}

        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.mine : styles.theirs, m.kind === 'blocked' && styles.blocked]}>
            {m.kind === 'blocked' && (
              <View style={styles.blockedHead}>
                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                <Text style={styles.blockedTitle}>Protegido contra spoilers</Text>
              </View>
            )}
            <Text style={[styles.text, m.role === 'user' && styles.mineText]} selectable>{m.text}</Text>
            {m.sources?.length > 0 && (
              <View style={styles.sources}>
                <Text style={styles.sourcesTitle}>No texto lido</Text>
                {m.sources.map((s, k) => (
                  <Touchable
                    key={k}
                    style={styles.source}
                    onPress={() => onSource?.(s.pageIndex)}
                    accessibilityLabel={`Ir para ${s.label}`}
                  >
                    <Text style={styles.sourceQuote} numberOfLines={2}>“{s.quote}”</Text>
                    <Text style={styles.sourceLabel}>{s.label}</Text>
                  </Touchable>
                ))}
              </View>
            )}
          </View>
        ))}

        {busy && (
          <View style={[styles.bubble, styles.theirs, styles.busy]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.busyText}>Relendo o que você já leu...</Text>
          </View>
        )}

        {error && !busy && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={() => send()}
          editable={!busy}
          accessibilityLabel={placeholder}
          maxLength={400}
        />
        <Touchable
          style={[styles.sendBtn, (!input.trim() || busy) && styles.sendOff]}
          onPress={() => send()}
          disabled={!input.trim() || busy}
          accessibilityLabel="Enviar pergunta"
        >
          <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
        </Touchable>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: space.lg,
    gap: space.md,
  },
  empty: {
    gap: space.md,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  chips: {
    gap: space.sm,
  },
  chip: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  bubble: {
    maxWidth: '92%',
    padding: space.md,
    borderRadius: radius.lg,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  mineText: {
    color: colors.onPrimary,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
  },
  blocked: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  blockedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  sources: {
    marginTop: space.md,
    gap: 6,
  },
  sourcesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  source: {
    paddingLeft: space.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    gap: 2,
  },
  sourceQuote: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  busyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendOff: {
    opacity: 0.4,
  },
});
