import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Touchable from './Touchable';
import AccessBadge from './AccessBadge';
import { Cover } from './WorkRow';
import { useToast } from './Toast';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import { catalog } from '../services/catalogClient';
import { storage } from '../services/storage';
import { ai } from '../services/ai';
import { statusOf } from '../services/readingStats';
import { inferTaste } from '../services/personal';
import { workIdOf } from '../services/libraryAdd';
import { normalize } from '../services/catalog/text';
import { genreLabel } from '../services/catalog/genres';
import { languageLabel } from '../services/catalog/languages';
import { SOURCE_LABELS } from '../services/catalog/sources';
import { CATEGORIES, GOALS, buildSignals, seenFromBooks, goalContext, recommend } from '../services/recommend/engine';
import { minimizeProfile } from '../services/recommend/curator';

const QUICK = [
  { id: 'interested', label: 'Tenho interesse', icon: 'heart-outline' },
  { id: 'add', label: 'Adicionar', icon: 'add-circle-outline' },
  { id: 'read', label: 'Já li', icon: 'checkmark-circle-outline' },
  { id: 'not_interested', label: 'Sem interesse', icon: 'close-circle-outline' },
];
const MORE = [
  { id: 'dislike_kind', label: 'Não gosto desse tipo' },
  { id: 'known_author', label: 'Já conheço o autor' },
  { id: 'more_like', label: 'Mais assim' },
  { id: 'different', label: 'Algo bem diferente' },
];

const GUESS = [
  [/diferente|oposto|outra vis|contr[aá]ri|desafi/i, 'perspectiva'],
  [/novo|surpreend|inesperad|fora d|nunca li/i, 'horizontes'],
  [/autor|autora|escritor/i, 'autores'],
];

function Card({ item, category, styles, colors, reason, aiReason, state, onOpen, onAction, owned }) {
  const { work } = item;
  const [more, setMore] = useState(false);
  const meta = [work.authors.join(', ') || 'Autor não informado', work.languages[0] ? languageLabel(work.languages[0]) : null, work.firstYear].filter(Boolean).join(' • ');
  const sources = work.sources.map((s) => SOURCE_LABELS[s]).join(' · ');
  const metric = category.id === 'afinidade' ? `Afinidade ${item.affinity}%` : `Novidade ${item.novelty}%`;
  const perspective = category.id === 'perspectiva';

  return (
    <View style={[styles.card, perspective && styles.cardPerspective]}>
      <Touchable style={styles.cardTop} onPress={() => onOpen(work)} accessibilityLabel={`Detalhes de ${work.title}`}>
        <Cover uri={work.cover} styles={styles} color={colors.textMuted} />
        <View style={styles.cardInfo}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, perspective && styles.tagPerspective]}>
              <Text style={[styles.tagText, perspective && styles.tagTextPerspective]}>{category.tag}</Text>
            </View>
            <Text style={styles.metric}>{metric}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{work.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
          <View style={styles.badges}>
            <AccessBadge level={work.best.access.level} compact />
            {work.genres[0] ? <Text style={styles.genre}>{genreLabel(work.genres[0])}</Text> : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>{sources}</Text>
        </View>
      </Touchable>
      {work.description ? <Text style={styles.synopsis} numberOfLines={3}>{work.description}</Text> : null}
      <Text style={styles.availability}>{item.availability}</Text>
      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>{aiReason ? 'Por que sugerimos (IA, só com livros do catálogo)' : 'Por que sugerimos'}</Text>
        <Text style={styles.reason}>{reason}</Text>
        {item.perspective ? (
          <>
            <Text style={styles.reason}>{item.perspective.title}: {item.perspective.note}</Text>
            <Text style={styles.evidence}>{item.perspective.evidence}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.actions}>
        {QUICK.map((q) => {
          const on = state === q.id || (q.id === 'add' && owned);
          return (
            <Touchable key={q.id} style={[styles.action, on && styles.actionOn]} onPress={() => onAction(work, q.id)} accessibilityLabel={q.label} accessibilityState={{ selected: on }}>
              <Ionicons name={on ? q.icon.replace('-outline', '') : q.icon} size={15} color={on ? colors.onPrimary : colors.primary} />
              <Text style={[styles.actionText, on && styles.actionTextOn]}>{q.label}</Text>
            </Touchable>
          );
        })}
        <Touchable style={styles.action} onPress={() => setMore((m) => !m)} accessibilityLabel="Mais opções">
          <Ionicons name="ellipsis-horizontal" size={15} color={colors.primary} />
        </Touchable>
      </View>
      {more ? (
        <View style={styles.actions}>
          {MORE.map((m) => (
            <Touchable key={m.id} style={[styles.action, state === m.id && styles.actionOn]} onPress={() => onAction(work, m.id)}>
              <Text style={[styles.actionText, state === m.id && styles.actionTextOn]}>{m.label}</Text>
            </Touchable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function ForYouView({ onOpenWork, onAddWork, isOwned }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toast = useToast();
  const navigation = useNavigation();
  const [base, setBase] = useState(null);
  const [goal, setGoal] = useState(null);
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [chat, setChat] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatWorks, setChatWorks] = useState({});
  const run = useRef(0);

  const prepare = useCallback(async () => {
    const [personal, active, chest, overview] = await Promise.all([
      storage.getPersonal(),
      storage.getBooks(0).catch(() => []),
      storage.getChestBooks(0).catch(() => []),
      storage.getReadingOverview(),
    ]);
    const books = [...active, ...chest];
    const taste = inferTaste({ books, statusOf, log: overview.log, positions: overview.positions, personal });
    const signals = buildSignals({ taste, declared: personal.declared, feedback: personal.recFeedback });
    const ctx = {
      signals,
      seen: seenFromBooks(books, taste, personal.recFeedback),
      ownedIds: new Set(books.map(workIdOf)),
      ownedTitles: new Set(books.map((b) => normalize(b.title))),
      feedback: personal.recFeedback,
      shown: personal.recs,
    };
    return { ctx, personal, taste, books, profile: minimizeProfile({ signals, declared: personal.declared, taste }) };
  }, []);

  const load = useCallback(async (goalId = null) => {
    const id = run.current + 1;
    run.current = id;
    setLoading(true);
    try {
      const prepared = await prepare();
      if (run.current !== id) return;
      setBase(prepared);
      setFeedback(Object.fromEntries(Object.entries(prepared.personal.recFeedback).map(([k, v]) => [k, v.action])));
      setChat(prepared.personal.chat || []);
      const ctx = goalContext(prepared.ctx, goalId);
      const ids = goalId ? ['afinidade'] : CATEGORIES.map((c) => c.id);
      const results = await Promise.all(ids.map((cid) => recommend({ catalog, category: cid, ctx, limit: 4 })));
      if (run.current !== id) return;
      const next = {};
      ids.forEach((cid, i) => { next[cid] = { ...results[i], reasons: new Map() }; });
      setSections(next);
      setLoading(false);
      const shown = ids.flatMap((cid) => next[cid].items.map((it) => it.work.id));
      if (shown.length) storage.recordRecsShown(shown).catch(() => {});
      if (ai.isAvailable) {
        ids.forEach((cid) => {
          if (!next[cid].items.length) return;
          ai.explainRecommendations({ category: CATEGORIES.find((c) => c.id === cid).title, profile: prepared.profile, items: next[cid].items })
            .then(({ reasons }) => {
              if (run.current !== id) return;
              setSections((prev) => ({ ...prev, [cid]: { ...prev[cid], reasons } }));
            })
            .catch(() => {});
        });
      }
    } catch {
      if (run.current === id) {
        setSections({});
        setLoading(false);
        toast.show('Não foi possível montar as sugestões agora.', 'error');
      }
    }
  }, [prepare, toast]);

  useEffect(() => {
    load(null);
  }, [load]);

  const pickGoal = (id) => {
    const next = goal === id ? null : id;
    setGoal(next);
    load(next);
  };

  const hide = (workId) => {
    setSections((prev) => Object.fromEntries(Object.entries(prev).map(([cid, sec]) => [cid, { ...sec, items: sec.items.filter((it) => it.work.id !== workId) }])));
  };

  const onAction = async (work, action) => {
    try {
      if (action === 'add') {
        const ok = await onAddWork(work);
        if (ok) {
          await storage.setRecFeedback(work, 'added');
          setFeedback((f) => ({ ...f, [work.id]: 'added' }));
        }
        return;
      }
      await storage.setRecFeedback(work, action);
      setFeedback((f) => ({ ...f, [work.id]: action }));
      if (['not_interested', 'read', 'dislike_kind', 'known_author', 'different'].includes(action)) {
        hide(work.id);
        toast.show(action === 'read' ? 'Anotado. Não vamos mais sugerir este livro.' : 'Anotado. Vamos considerar isso nas próximas sugestões.');
      } else {
        toast.show(action === 'more_like' ? 'Vamos mostrar mais livros assim.' : 'Anotado.');
      }
    } catch {
      toast.show('Não foi possível registrar. Tente de novo.', 'error');
    }
  };

  const ask = async () => {
    const text = question.trim();
    if (!text || asking || !base) return;
    setAsking(true);
    const history = [...chat, { role: 'user', text }];
    setChat(history);
    setQuestion('');
    try {
      const category = (GUESS.find(([re]) => re.test(text)) || [null, 'afinidade'])[1];
      const prepared = await prepare();
      const fresh = await recommend({ catalog, category, ctx: goalContext(prepared.ctx, goal), limit: 6 });
      const pool = new Map();
      [...fresh.items, ...Object.values(sections).flatMap((s) => s.items || [])].forEach((it) => {
        if (!pool.has(it.work.id)) pool.set(it.work.id, it);
      });
      const candidates = [...pool.values()].slice(0, 12);
      const result = await ai.converseCurator({ question: text, profile: prepared.profile, history: chat, candidates });
      const reply = {
        role: 'assistant',
        text: result.answer,
        picks: result.picks.map((p) => ({ id: p.item.work.id, title: p.item.work.title, reason: p.reason })),
        questions: result.questions,
      };
      const nextChat = [...history, reply];
      setChat(nextChat);
      setChatWorks((prev) => ({ ...prev, ...Object.fromEntries(result.picks.map((p) => [p.item.work.id, p.item.work])) }));
      storage.saveCuratorChat(nextChat.map(({ role, text: t, picks }) => ({ role, text: t, picks }))).catch(() => {});
    } catch (e) {
      setChat([...history, { role: 'assistant', text: e.message || 'Não consegui responder agora.', error: true }]);
    } finally {
      setAsking(false);
    }
  };

  const clearChat = async () => {
    setChat([]);
    setChatWorks({});
    try {
      await storage.clearPersonal('chat');
    } catch {
      toast.show('Não foi possível apagar a conversa.', 'error');
    }
  };

  const noProfile = base && base.ctx.signals.source === 'nenhum';
  const allEmpty = !loading && base && CATEGORIES.every((c) => !(sections[c.id]?.items || []).length);
  const allFailed = !loading && Object.values(sections).length > 0 && Object.values(sections).every((s) => s.allFailed);

  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        <Text style={styles.introText}>
          {noProfile
            ? 'Ainda sabemos pouco sobre você. Declare seus gostos ou avalie livros lidos para sugestões mais certeiras. Enquanto isso, mostramos descobertas variadas.'
            : `Sugestões baseadas no que você ${base?.ctx.signals.source === 'declarado' ? 'declarou' : base?.ctx.signals.source === 'inferido' ? 'leu e avaliou' : 'declarou, leu e avaliou'}. Livros que você só adicionou não contam como gosto.`}
        </Text>
      </View>
      <Touchable style={styles.profileLink} onPress={() => navigation.navigate('PerfilLiterario')} accessibilityLabel="Abrir meu perfil literário">
        <Text style={styles.profileLinkText}>{noProfile ? 'Montar meu perfil literário' : 'Ver e editar meu perfil literário'}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </Touchable>

      <Text style={styles.sectionLabel}>Tenho um objetivo</Text>
      <View style={styles.goals}>
        {GOALS.map((g) => (
          <Touchable key={g.id} style={[styles.goal, goal === g.id && styles.goalOn]} onPress={() => pickGoal(g.id)} accessibilityState={{ selected: goal === g.id }}>
            <Text style={[styles.goalText, goal === g.id && styles.goalTextOn]}>{g.label}</Text>
          </Touchable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Consultando as bibliotecas e montando suas sugestões...</Text>
        </View>
      ) : null}

      {allFailed ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Não consegui consultar as bibliotecas</Text>
          <Text style={styles.muted}>Verifique a conexão e tente de novo.</Text>
          <Touchable style={styles.retry} onPress={() => load(goal)}><Text style={styles.retryText}>Tentar de novo</Text></Touchable>
        </View>
      ) : null}

      {allEmpty && !allFailed ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Sem sugestões novas agora</Text>
          <Text style={styles.muted}>Tudo o que encontrei já está na sua biblioteca ou foi dispensado. Atualize ou ajuste seu perfil.</Text>
        </View>
      ) : null}

      {!loading && CATEGORIES.filter((c) => goal ? c.id === 'afinidade' : true).map((cat) => {
        const sec = sections[cat.id];
        if (!sec || !sec.items.length) return null;
        const title = goal && cat.id === 'afinidade' ? `Para: ${GOALS.find((g) => g.id === goal).label}` : cat.title;
        return (
          <View key={cat.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.muted}>{cat.hint}</Text>
            {sec.items.map((item) => (
              <Card
                key={item.work.id}
                item={item}
                category={cat}
                styles={styles}
                colors={colors}
                reason={sec.reasons.get(item.work.id) || `Combina porque: ${item.reasons.join('; ')}.`}
                aiReason={sec.reasons.has(item.work.id)}
                state={feedback[item.work.id]}
                owned={isOwned(item.work)}
                onOpen={onOpenWork}
                onAction={onAction}
              />
            ))}
          </View>
        );
      })}

      {!loading ? (
        <Touchable style={styles.refresh} onPress={() => load(goal)} accessibilityLabel="Atualizar sugestões">
          <Ionicons name="refresh" size={16} color={colors.primary} />
          <Text style={styles.refreshText}>Outras sugestões</Text>
        </Touchable>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Converse com a curadora</Text>
        {!ai.isAvailable ? (
          <Text style={styles.muted}>A conversa precisa do serviço de IA, que não está configurado neste ambiente. As sugestões acima funcionam sem ele.</Text>
        ) : (
          <>
            <Text style={styles.muted}>Peça algo como “quero algo diferente do que eu leio”. Ela só indica livros verificados no catálogo e explica o raciocínio.</Text>
            {chat.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot, m.error && styles.bubbleError]}>
                <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.text}</Text>
                {(m.picks || []).map((p) => (
                  <Touchable key={p.id} style={styles.pick} onPress={() => chatWorks[p.id] && onOpenWork(chatWorks[p.id])} disabled={!chatWorks[p.id]} accessibilityLabel={`Abrir ${p.title}`}>
                    <Text style={styles.pickTitle}>{p.title}</Text>
                    {p.reason ? <Text style={styles.pickReason}>{p.reason}</Text> : null}
                  </Touchable>
                ))}
                {(m.questions || []).map((q) => (
                  <Touchable key={q} style={styles.followUp} onPress={() => setQuestion(q)}>
                    <Text style={styles.followUpText}>{q}</Text>
                  </Touchable>
                ))}
              </View>
            ))}
            {asking ? <ActivityIndicator color={colors.primary} /> : null}
            <View style={styles.askRow}>
              <TextInput
                style={styles.askInput}
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={ask}
                placeholder="Pergunte à curadora"
                placeholderTextColor={colors.textMuted}
                maxLength={300}
                returnKeyType="send"
                accessibilityLabel="Pergunta para a curadora"
              />
              <Touchable style={[styles.send, (!question.trim() || asking) && styles.disabled]} onPress={ask} disabled={!question.trim() || asking} accessibilityLabel="Enviar pergunta">
                <Ionicons name="send" size={16} color={colors.onPrimary} />
              </Touchable>
            </View>
            {chat.length ? (
              <Touchable style={styles.clear} onPress={clearChat}>
                <Text style={styles.clearText}>Apagar esta conversa</Text>
              </Touchable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { gap: space.md },
  intro: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  introText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.text },
  profileLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  profileLinkText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goal: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  goalOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  goalText: { fontSize: 13, color: colors.text },
  goalTextOn: { color: colors.onPrimary, fontWeight: '700' },
  center: { alignItems: 'center', gap: 8, paddingVertical: space.xl },
  emptyTitle: { fontSize: 16, color: colors.text, fontFamily: fonts.heading },
  muted: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  retry: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },
  section: { gap: space.sm, marginTop: space.md },
  sectionTitle: { fontSize: 18, color: colors.text, fontFamily: fonts.heading },
  card: { padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card, gap: space.sm },
  cardPerspective: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.warning, backgroundColor: colors.warningLight },
  cardTop: { flexDirection: 'row', gap: 12 },
  cover: { width: 56, height: 82, borderRadius: 5, backgroundColor: colors.borderLight },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 3 },
  tagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primaryLight },
  tagText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  tagPerspective: { backgroundColor: colors.warning },
  tagTextPerspective: { color: colors.onPrimary },
  metric: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
  title: { fontSize: 15, color: colors.text, fontFamily: fonts.heading, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.textSecondary },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  genre: { fontSize: 11, color: colors.textSecondary },
  synopsis: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  availability: { fontSize: 12, fontWeight: '700', color: colors.text },
  reasonBox: { gap: 3, padding: space.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceSoft },
  reasonLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
  reason: { fontSize: 12, lineHeight: 17, color: colors.text },
  evidence: { fontSize: 11, lineHeight: 15, color: colors.warningText, fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border },
  actionOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  actionTextOn: { color: colors.onPrimary },
  refresh: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary },
  refreshText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  bubble: { padding: space.md, borderRadius: radius.md, gap: 6 },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: 'flex-end', maxWidth: '85%' },
  bubbleBot: { backgroundColor: colors.surfaceSoft, alignSelf: 'flex-start', maxWidth: '95%' },
  bubbleError: { backgroundColor: colors.warningLight },
  bubbleText: { fontSize: 13, lineHeight: 19, color: colors.text },
  bubbleTextUser: { color: colors.onPrimary },
  pick: { padding: space.sm, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
  pickTitle: { fontSize: 13, fontWeight: '700', color: colors.primary },
  pickReason: { fontSize: 12, color: colors.textSecondary },
  followUp: { paddingVertical: 6 },
  followUpText: { fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  askRow: { flexDirection: 'row', gap: 8 },
  askInput: { flex: 1, minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: space.md, fontSize: 14, color: colors.text },
  send: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  clear: { alignSelf: 'flex-start', paddingVertical: 6 },
  clearText: { fontSize: 12, color: colors.danger },
});
