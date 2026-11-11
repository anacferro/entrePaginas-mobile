import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai } from '../services/ai';
import { pageLabel } from '../services/bookContext';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';
import AiChat from './AiChat';
import { SpoilerBadge } from './SpoilerPill';

export default function ExplainPassage({ visible, onClose, passage, chapters, pages, limitIndex, spoilerFree, currentIndex }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = useRef(0);
  const messagesRef = useRef([]);

  const request = useCallback(async (question, history) => {
    const id = run.current + 1;
    run.current = id;
    setBusy(true);
    setError(null);
    try {
      const result = await ai.explain({
        chapters,
        pages,
        limitIndex,
        spoilerFree,
        passage: passage.text,
        pageIndex: passage.pageIndex,
        question,
        history,
      });
      if (run.current !== id) return;
      const next = [...messagesRef.current, { role: 'ai', text: result.answer }];
      messagesRef.current = next;
      setMessages(next);
    } catch (e) {
      if (run.current === id) setError(e.message);
    } finally {
      if (run.current === id) setBusy(false);
    }
  }, [chapters, pages, limitIndex, spoilerFree, passage]);

  useEffect(() => {
    if (!visible || !passage) return undefined;
    messagesRef.current = [];
    setMessages([]);
    request(null, []);
    return () => {
      run.current += 1;
    };
  }, [visible, passage, request]);

  if (!passage) return null;

  const onSend = (text) => {
    const history = messagesRef.current;
    const next = [...history, { role: 'user', text }];
    messagesRef.current = next;
    setMessages(next);
    request(text, history);
  };

  const label = pageLabel(chapters, pages, passage.pageIndex);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar explicação" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={16} color={colors.secondary} />
              <Text style={styles.title}>Explique este trecho</Text>
            </View>
            <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Touchable>
          </View>

          <View style={styles.quote}>
            <Text style={styles.quoteText} numberOfLines={4}>“{passage.text}”</Text>
            <Text style={styles.quoteLabel}>{label}</Text>
          </View>

          <SpoilerBadge
            spoilerFree={spoilerFree}
            upTo={currentIndex + 1}
            total={pages.length}
            style={styles.badge}
          />

          <AiChat
            messages={messages}
            busy={busy}
            error={error}
            onSend={onSend}
            placeholder="Pergunte mais sobre o trecho"
            suggestions={[]}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    height: '78%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.lg,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  quote: {
    marginHorizontal: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    backgroundColor: colors.surfaceSoft,
    gap: 4,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    color: colors.text,
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  badge: {
    marginLeft: space.lg,
    marginTop: space.md,
  },
});
