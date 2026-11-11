import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai } from '../services/ai';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';
import AiChat from './AiChat';
import SpoilerBadge from './SpoilerBadge';

export default function AskBook({ visible, onClose, bookId, chapters, pages, currentIndex, onGoToPage }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const messagesRef = useRef([]);
  const run = useRef(0);

  useEffect(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    run.current += 1;
    setBusy(false);
  }, [bookId]);

  const onSend = useCallback(async (question) => {
    const history = messagesRef.current;
    const withQuestion = [...history, { role: 'user', text: question }];
    messagesRef.current = withQuestion;
    setMessages(withQuestion);
    setBusy(true);
    setError(null);
    const id = run.current + 1;
    run.current = id;
    try {
      const result = await ai.ask({ chapters, pages, limitIndex: currentIndex, question, history });
      if (run.current !== id) return;
      const next = [...messagesRef.current, { role: 'ai', text: result.answer, kind: result.kind, sources: result.sources }];
      messagesRef.current = next;
      setMessages(next);
    } catch (e) {
      if (run.current === id) setError(e.message);
    } finally {
      if (run.current === id) setBusy(false);
    }
  }, [chapters, pages, currentIndex]);

  const goTo = (pageIndex) => {
    onGoToPage(pageIndex);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.secondary} />
              <Text style={styles.title}>Perguntar sobre a história</Text>
            </View>
            <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Touchable>
          </View>
          <SpoilerBadge upTo={currentIndex + 1} total={pages.length} style={styles.badge} />
          <Text style={styles.note}>
            A IA só recebe o texto até a folha em que você está e mostra os trechos de onde tirou cada resposta.
          </Text>
          <AiChat
            messages={messages}
            busy={busy}
            error={error}
            onSend={onSend}
            onSource={goTo}
            placeholder="Pergunte sobre a história"
            suggestions={['O que aconteceu até agora?', 'Quem são os personagens principais?']}
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
    height: '82%',
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
  badge: {
    marginLeft: space.lg,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
});
