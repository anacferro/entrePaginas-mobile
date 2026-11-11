import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai } from '../services/ai';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';
import AiChat from './AiChat';
import CharacterMap from './CharacterMap';
import { SpoilerBadge } from './SpoilerPill';

const TABS = [
  { id: 'ask', label: 'Perguntar', icon: 'chatbubble-ellipses-outline' },
  { id: 'people', label: 'Personagens', icon: 'people-outline' },
];

export default function ReadingCompanion({
  visible,
  onClose,
  bookId,
  chapters,
  pages,
  currentIndex,
  spoilerFree,
  onToggleSpoiler,
  onGoToPage,
  initialTab = 'ask',
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState(initialTab);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const messagesRef = useRef([]);
  const run = useRef(0);

  const limitIndex = spoilerFree ? currentIndex : pages.length - 1;

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

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
      const result = await ai.ask({ chapters, pages, limitIndex, spoilerFree, question, history });
      if (run.current !== id) return;
      const next = [...messagesRef.current, { role: 'ai', text: result.answer, kind: result.kind, sources: result.sources }];
      messagesRef.current = next;
      setMessages(next);
    } catch (e) {
      if (run.current === id) setError(e.message);
    } finally {
      if (run.current === id) setBusy(false);
    }
  }, [chapters, pages, limitIndex, spoilerFree]);

  const goTo = (pageIndex) => {
    onGoToPage(pageIndex);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar companheira de leitura" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={16} color={colors.secondary} />
              <Text style={styles.title}>Companheira de leitura</Text>
            </View>
            <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Touchable>
          </View>

          <View style={styles.guard}>
            <SpoilerBadge spoilerFree={spoilerFree} upTo={currentIndex + 1} total={pages.length} />
            <View style={styles.toggle}>
              <Text style={styles.toggleLabel}>Modo sem spoilers</Text>
              <Switch
                value={spoilerFree}
                onValueChange={onToggleSpoiler}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel="Modo sem spoilers"
              />
            </View>
          </View>
          <Text style={styles.guardNote}>
            {spoilerFree
              ? `A IA só recebe o texto até a folha ${currentIndex + 1} de ${pages.length}. O limite acompanha a folha em que você está, inclusive se voltar.`
              : 'Com spoilers liberados, a IA pode usar o livro inteiro. Ligue o modo para voltar à proteção.'}
          </Text>

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <Touchable
                key={t.id}
                style={[styles.tab, tab === t.id && styles.tabOn]}
                onPress={() => setTab(t.id)}
                accessibilityState={{ selected: tab === t.id }}
              >
                <Ionicons name={t.icon} size={16} color={tab === t.id ? colors.onPrimary : colors.textSecondary} />
                <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
              </Touchable>
            ))}
          </View>

          <View style={styles.body}>
            {tab === 'ask' ? (
              <AiChat
                messages={messages}
                busy={busy}
                error={error}
                onSend={onSend}
                onSource={goTo}
                placeholder="Pergunte sobre a história"
                emptyHint="Pergunte à vontade: as respostas usam só o que você já leu e mostram os trechos de onde vieram."
                suggestions={['O que aconteceu até agora?', 'Quem são os personagens principais?', 'Qual é a relação entre os personagens?']}
              />
            ) : (
              <CharacterMap
                bookId={bookId}
                chapters={chapters}
                pages={pages}
                limitIndex={limitIndex}
                spoilerFree={spoilerFree}
                onGoToPage={goTo}
              />
            )}
          </View>
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
    height: '88%',
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
  guard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  guardNote: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  tabs: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.lg,
    paddingBottom: space.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextOn: {
    color: colors.onPrimary,
  },
  body: {
    flex: 1,
  },
});
