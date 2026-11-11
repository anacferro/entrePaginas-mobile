import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TextInput, Switch, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Touchable from '../components/Touchable';
import StarRating from '../components/StarRating';
import RatingSheet from '../components/RatingSheet';
import LoadingView from '../components/LoadingView';
import { useToast } from '../components/Toast';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, layout, radius, space } from '../theme/tokens';
import { storage } from '../services/storage';
import { statusOf } from '../services/readingStats';
import { TRAITS, ERAS, LENGTHS, PERIODS, inferTaste, profileCompleteness, exportPersonal } from '../services/personal';
import { GENRES, genreLabel } from '../services/catalog/genres';
import { LANGUAGE_OPTIONS, languageLabel } from '../services/catalog/languages';

const EXTRA_TRAITS = {
  'enredo-bem-desenvolvido': 'Enredo bem desenvolvido',
  'estilo-de-escrita': 'Estilo de escrita',
  'leitura-envolvente': 'Leitura envolvente',
  previsibilidade: 'Previsibilidade',
};

const traitLabel = (key) => TRAITS.find((t) => t.key === key)?.label || EXTRA_TRAITS[key] || key;
const eraLabel = (key) => ERAS.find((e) => e.key === key)?.label || key;
const lengthLabel = (key) => LENGTHS.find((l) => l.key === key)?.label || key;

const STEPS = [
  { id: 'genres', title: 'Gêneros que você gosta', kind: 'multi', field: 'genres', options: GENRES.map((g) => ({ key: g.key, label: g.label })) },
  { id: 'traits', title: 'O que você procura numa história', kind: 'multi', field: 'traits', options: TRAITS },
  { id: 'authors', title: 'Autores e livros que marcaram você', kind: 'texts', fields: [
    { field: 'favoriteAuthors', label: 'Autores favoritos' },
    { field: 'favoriteBooks', label: 'Livros favoritos' },
    { field: 'wantAuthors', label: 'Autores que quer conhecer' },
  ] },
  { id: 'languages', title: 'Idiomas de leitura', kind: 'multi', field: 'languages', options: LANGUAGE_OPTIONS.map((l) => ({ key: l.code, label: l.label })) },
  { id: 'eras', title: 'Épocas e estilo', kind: 'multi', field: 'eras', options: ERAS, single: { field: 'period', label: 'Prefere', options: PERIODS } },
  { id: 'topics', title: 'Temas e tamanho', kind: 'texts', fields: [
    { field: 'topics', label: 'Temas que quer explorar' },
    { field: 'avoidTopics', label: 'Temas que prefere evitar' },
  ], single: { field: 'length', label: 'Tamanho preferido', options: LENGTHS } },
];

const splitList = (text) => text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

function Chip({ label, on, onPress, styles }) {
  return (
    <Touchable style={[styles.chip, on && styles.chipOn]} onPress={onPress} accessibilityState={{ selected: on }}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Touchable>
  );
}

function TasteList({ title, items, label, styles, negative }) {
  if (!items?.length) return null;
  return (
    <View style={styles.tasteBlock}>
      <Text style={styles.tasteTitle}>{title}</Text>
      <View style={styles.chipsRow}>
        {items.slice(0, 6).map((row) => (
          <View key={row.key} style={[styles.tasteChip, negative && styles.tasteChipNeg]}>
            <Text style={[styles.tasteChipText, negative && styles.tasteChipTextNeg]}>{label(row.key)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function LiteraryProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [personal, setPersonal] = useState(null);
  const [taste, setTaste] = useState(null);
  const [step, setStep] = useState(null);
  const [draft, setDraft] = useState({});
  const [rating, setRating] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, active, chest, overview] = await Promise.all([
        storage.getPersonal(),
        storage.getBooks(0),
        storage.getChestBooks(0),
        storage.getReadingOverview(),
      ]);
      setPersonal(p);
      setTaste(inferTaste({ books: [...active, ...chest], statusOf, log: overview.log, positions: overview.positions, personal: p }));
    } catch {
      toast.show('Não foi possível carregar seu perfil literário.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openStep = (index) => {
    const d = personal.declared;
    const next = {};
    STEPS[index].fields?.forEach((f) => { next[f.field] = d[f.field].join(', '); });
    if (STEPS[index].field) next[STEPS[index].field] = d[STEPS[index].field];
    if (STEPS[index].single) next[STEPS[index].single.field] = d[STEPS[index].single.field];
    setDraft(next);
    setStep(index);
  };

  const commit = async (patch, nextStep) => {
    try {
      const p = await storage.saveDeclared(patch, nextStep);
      setPersonal(p);
      load();
      return true;
    } catch {
      toast.show('Não foi possível salvar. Tente de novo.', 'error');
      return false;
    }
  };

  const saveStep = async () => {
    const def = STEPS[step];
    const patch = {};
    if (def.field) patch[def.field] = draft[def.field] || [];
    def.fields?.forEach((f) => { patch[f.field] = splitList(draft[f.field] || ''); });
    if (def.single) patch[def.single.field] = draft[def.single.field] ?? null;
    const last = step === STEPS.length - 1;
    const ok = await commit(patch, last ? 0 : step + 1);
    if (!ok) return;
    if (last) {
      setStep(null);
      toast.show('Perfil literário salvo.');
    } else {
      openStep(step + 1);
    }
  };

  const skipStep = async () => {
    const last = step === STEPS.length - 1;
    await commit({}, last ? 0 : step + 1);
    if (last) setStep(null);
    else openStep(step + 1);
  };

  const toggleMulti = (field, key) => {
    setDraft((d) => {
      const list = d[field] || [];
      return { ...d, [field]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] };
    });
  };

  const setSetting = async (key, value) => {
    try {
      setPersonal(await storage.setPersonalSettings({ [key]: value }));
      load();
    } catch {
      toast.show('Não foi possível salvar a preferência.', 'error');
    }
  };

  const clear = async (part, message) => {
    try {
      setPersonal(await storage.clearPersonal(part));
      setConfirm(null);
      load();
      toast.show(message);
    } catch {
      toast.show('Não foi possível apagar. Tente de novo.', 'error');
    }
  };

  const exportData = async () => {
    const text = exportPersonal(personal);
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'entre-paginas-perfil-literario.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: text, title: 'Perfil literário' });
      }
    } catch {
      toast.show('Não foi possível exportar.', 'error');
    }
  };

  if (loading || !personal) return <LoadingView message="Carregando seu perfil literário..." />;

  const { declared, settings } = personal;
  const completeness = profileCompleteness(declared);
  const ratings = Object.values(personal.ratings).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const hasTaste = taste && (taste.genres.liked.length || taste.authors.liked.length || taste.genres.disliked.length || taste.traits.liked.length);
  const declaredRows = [
    ['Gêneros', declared.genres.map((k) => genreLabel(k))],
    ['Procura', declared.traits.map(traitLabel)],
    ['Autores favoritos', declared.favoriteAuthors],
    ['Livros favoritos', declared.favoriteBooks],
    ['Quer conhecer', declared.wantAuthors],
    ['Idiomas', declared.languages.map((k) => languageLabel(k))],
    ['Épocas', declared.eras.map(eraLabel)],
    ['Prefere', declared.period ? [PERIODS.find((p) => p.key === declared.period)?.label] : []],
    ['Quer explorar', declared.topics],
    ['Prefere evitar', declared.avoidTopics],
    ['Tamanho', declared.length ? [lengthLabel(declared.length)] : []],
  ].filter(([, v]) => v.length);

  const confirmButton = (part, label, message) => (
    confirm === part ? (
      <View style={styles.confirmRow}>
        <Touchable style={styles.dangerBtn} onPress={() => clear(part, message)}>
          <Text style={styles.dangerText}>Confirmar: apagar</Text>
        </Touchable>
        <Touchable style={styles.ghostBtn} onPress={() => setConfirm(null)}>
          <Text style={styles.ghostText}>Cancelar</Text>
        </Touchable>
      </View>
    ) : (
      <Touchable style={styles.ghostBtn} onPress={() => setConfirm(part)}>
        <Text style={styles.ghostText}>{label}</Text>
      </Touchable>
    )
  );

  if (step !== null) {
    const def = STEPS[step];
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
        <View style={styles.topBar}>
          <Touchable style={styles.backBtn} onPress={() => setStep(null)} accessibilityLabel="Voltar ao perfil literário">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Touchable>
          <Text style={styles.topTitle}>Passo {step + 1} de {STEPS.length}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>{def.title}</Text>
          <Text style={styles.muted}>Tudo é opcional. Você pode pular e voltar quando quiser.</Text>

          {def.field && (
            <View style={styles.chipsRow}>
              {def.options.map((o) => (
                <Chip key={o.key} label={o.label} on={(draft[def.field] || []).includes(o.key)} onPress={() => toggleMulti(def.field, o.key)} styles={styles} />
              ))}
            </View>
          )}

          {def.fields?.map((f) => (
            <View key={f.field} style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={draft[f.field] || ''}
                onChangeText={(t) => setDraft((d) => ({ ...d, [f.field]: t }))}
                placeholder="Separe por vírgula"
                placeholderTextColor={colors.textMuted}
                maxLength={400}
              />
            </View>
          ))}

          {def.single && (
            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>{def.single.label}</Text>
              <View style={styles.chipsRow}>
                {def.single.options.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    on={draft[def.single.field] === o.key}
                    onPress={() => setDraft((d) => ({ ...d, [def.single.field]: d[def.single.field] === o.key ? null : o.key }))}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.footerRow}>
            <Touchable style={styles.ghostBtn} onPress={skipStep}>
              <Text style={styles.ghostText}>Pular</Text>
            </Touchable>
            <Touchable style={styles.primaryBtn} onPress={saveStep}>
              <Text style={styles.primaryText}>{step === STEPS.length - 1 ? 'Concluir' : 'Salvar e continuar'}</Text>
            </Touchable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <View style={styles.topBar}>
        <Touchable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Touchable>
        <Text style={styles.topTitle}>Meu perfil literário</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>O que você declarou</Text>
          <Text style={styles.muted}>{completeness.done} de {completeness.total} partes preenchidas. Responder ajuda, mas não é obrigatório.</Text>
          {declaredRows.length === 0 ? (
            <Text style={styles.empty}>Nada declarado ainda.</Text>
          ) : (
            declaredRows.map(([label, values]) => (
              <View key={label} style={styles.declRow}>
                <Text style={styles.declLabel}>{label}</Text>
                <Text style={styles.declValue}>{values.join(', ')}</Text>
              </View>
            ))
          )}
          <Touchable style={styles.primaryBtn} onPress={() => openStep(Math.min(personal.progress.step || 0, STEPS.length - 1))}>
            <Text style={styles.primaryText}>{completeness.done ? 'Editar perfil' : 'Montar meu perfil'}</Text>
          </Touchable>
          <View style={styles.stepsRow}>
            {STEPS.map((s, i) => (
              <Touchable key={s.id} style={styles.stepDot} onPress={() => openStep(i)} accessibilityLabel={`Ir para ${s.title}`}>
                <Text style={styles.stepDotText}>{i + 1}</Text>
              </Touchable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>O que percebemos pela sua leitura</Text>
          <Text style={styles.muted}>Inferido do seu histórico, separado do que você declarou. Livros apenas adicionados não contam como gosto.</Text>
          {hasTaste ? (
            <>
              <Text style={styles.confidence}>
                Confiança: {taste.confidence} ({taste.counts.finished} {taste.counts.finished === 1 ? 'livro lido' : 'livros lidos'}, {taste.counts.rated} avaliados)
              </Text>
              <TasteList title="Gêneros que combinam" items={taste.genres.liked} label={genreLabel} styles={styles} />
              <TasteList title="Autores que combinam" items={taste.authors.liked} label={(k) => k} styles={styles} />
              <TasteList title="O que funcionou" items={taste.traits.liked} label={traitLabel} styles={styles} />
              <TasteList title="Gêneros que pesaram contra" items={taste.genres.disliked} label={genreLabel} styles={styles} negative />
              <TasteList title="O que não funcionou" items={taste.traits.disliked} label={traitLabel} styles={styles} negative />
            </>
          ) : (
            <Text style={styles.empty}>Ainda não há leituras concluídas ou avaliadas para inferir seu gosto. Conforme você ler e avaliar, isso aparece aqui.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Minhas avaliações</Text>
          {ratings.length === 0 ? (
            <Text style={styles.empty}>Você ainda não avaliou nenhum livro. Ao marcar um livro como lido, a avaliação é oferecida.</Text>
          ) : (
            ratings.map((r) => (
              <Touchable
                key={r.workId}
                style={styles.ratingRow}
                onPress={() => setRating({ id: r.bookId || r.workId, title: r.title, catalog: { workId: r.workId } })}
                accessibilityLabel={`Editar avaliação de ${r.title}`}
              >
                <View style={styles.ratingText}>
                  <Text style={styles.ratingTitle} numberOfLines={1}>{r.title}</Text>
                  {!!r.authors?.length && <Text style={styles.muted} numberOfLines={1}>{r.authors.join(', ')}</Text>}
                </View>
                <StarRating value={r.stars} size={16} gap={1} />
              </Touchable>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacidade</Text>
          {[
            ['useRatings', 'Usar minhas notas nas recomendações'],
            ['useReviews', 'Usar detalhes e resenhas das avaliações'],
            ['useHistory', 'Usar meu histórico de leitura'],
          ].map(([key, label]) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Switch
                value={settings[key] !== false}
                onValueChange={(v) => setSetting(key, v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={label}
              />
            </View>
          ))}
          <Text style={styles.muted}>Desativar não apaga nada: apenas deixa esses dados de fora do que o app usa para sugerir livros.</Text>
          <View style={styles.actions}>
            <Touchable style={styles.ghostBtn} onPress={exportData}>
              <Text style={styles.ghostText}>Exportar meus dados</Text>
            </Touchable>
            {confirmButton('recs', 'Apagar histórico de recomendações e conversas', 'Histórico de recomendações apagado.')}
            {confirmButton('declared', 'Apagar perfil declarado', 'Perfil declarado apagado.')}
            {confirmButton('ratings', 'Apagar todas as avaliações', 'Avaliações apagadas.')}
          </View>
        </View>
      </ScrollView>

      <RatingSheet
        visible={!!rating}
        book={rating}
        onClose={() => { setRating(null); load(); }}
        onChanged={setPersonal}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  topTitle: { fontSize: 18, color: colors.text, fontFamily: fonts.heading },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  h1: { fontSize: 22, lineHeight: 28, color: colors.text, fontFamily: fonts.heading },
  muted: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.borderLight, gap: space.md },
  cardTitle: { fontSize: 16, color: colors.text, fontFamily: fonts.heading },
  empty: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  declRow: { gap: 2 },
  declLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  declValue: { fontSize: 14, color: colors.text },
  confidence: { fontSize: 13, fontWeight: '700', color: colors.primary },
  tasteBlock: { gap: space.sm },
  tasteTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  tasteChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceSoft },
  tasteChipText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  tasteChipNeg: { backgroundColor: colors.warningLight },
  tasteChipTextNeg: { color: colors.warningText },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextOn: { color: colors.onPrimary, fontWeight: '700' },
  fieldBox: { gap: space.sm },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: space.md, fontSize: 14, color: colors.text },
  footerRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  primaryBtn: { flex: 1, minHeight: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
  ghostBtn: { minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  ghostText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  dangerBtn: { flex: 1, minHeight: 46, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  dangerText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
  confirmRow: { flexDirection: 'row', gap: space.sm },
  stepsRow: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  stepDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  stepDotText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  ratingText: { flex: 1, minWidth: 0 },
  ratingTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  switchLabel: { flex: 1, fontSize: 14, color: colors.text },
  actions: { gap: space.sm },
});
