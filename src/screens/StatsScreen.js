import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Touchable from '../components/Touchable';
import BarChart from '../components/BarChart';
import ErrorView from '../components/ErrorView';
import LoadingView from '../components/LoadingView';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, layout, radius, space } from '../theme/tokens';
import { storage } from '../services/storage';
import { withPageCounts } from '../services/bookPages';
import { formatNumber } from '../services/readingStats';
import { indicators, booksOverTime, pagesPerMonth, calendar, distributions, narrative, rangeFor } from '../services/stats/insights';

const PERIODS = [
  { key: 'week', label: 'Semanas' },
  { key: 'month', label: 'Meses' },
  { key: 'year', label: 'Anos' },
  { key: 'custom', label: 'Personalizado' },
];

const DIMENSIONS = [
  { key: 'genre', label: 'Gênero' },
  { key: 'author', label: 'Autor' },
  { key: 'language', label: 'Idioma' },
  { key: 'decade', label: 'Década' },
  { key: 'type', label: 'Tipo' },
  { key: 'country', label: 'País' },
];

const EMPTY = { books: [], positions: {}, log: { books: {}, days: {}, goal: null }, personal: { ratings: {} } };

function Tile({ label, value, hint, styles }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ''}`}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
}

function Heatmap({ cal, styles, colors }) {
  const opacity = [0, 0.3, 0.55, 0.8, 1];
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.heatMonths}>
            {cal.columns.map((_, w) => {
              const mark = cal.monthMarks.find((m) => m.week === w);
              return <Text key={w} style={styles.heatMonth}>{mark ? mark.label : ''}</Text>;
            })}
          </View>
          <View style={styles.heatGrid} accessible accessibilityRole="image" accessibilityLabel={`Calendário de leitura com ${cal.activeDays} dias com leitura nas últimas 26 semanas`}>
            {cal.columns.map((col, w) => (
              <View key={w} style={styles.heatCol}>
                {col.map((cell) => (
                  <View
                    key={cell.key}
                    style={[styles.heatCell, cell.future ? styles.heatFuture : { backgroundColor: cell.level ? colors.primary : colors.borderLight, opacity: cell.level ? opacity[cell.level] : 0.6 }]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Menos</Text>
        {[0, 1, 2, 3, 4].map((l) => <View key={l} style={[styles.heatCell, { backgroundColor: l ? colors.primary : colors.borderLight, opacity: l ? opacity[l] : 0.6 }]} />)}
        <Text style={styles.legendText}>Mais páginas no dia</Text>
      </View>
    </View>
  );
}

function Rows({ rows, styles }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <View style={styles.rows}>
      {rows.map((r) => (
        <View key={r.key} style={styles.distRow} accessible accessibilityLabel={`${r.label}: ${r.count}`}>
          <Text style={styles.distLabel} numberOfLines={1}>{r.label}</Text>
          <View style={styles.distTrack}><View style={[styles.distFill, { width: `${Math.round((r.count / max) * 100)}%` }]} /></View>
          <Text style={styles.distCount}>{r.count}</Text>
        </View>
      ))}
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [dimension, setDimension] = useState('genre');
  const [scope, setScope] = useState('lidos');
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      setError(null);
      const [active, chest, overview, personal] = await Promise.all([
        storage.getBooks(0),
        storage.getChestBooks(0),
        storage.getReadingOverview(),
        storage.getPersonal(),
      ]);
      setData({ books: withPageCounts([...active, ...chest]), positions: overview.positions, log: overview.log, personal });
      setNow(new Date());
    } catch {
      setError('Não foi possível carregar suas estatísticas. Toque em tentar de novo ou puxe a tela para baixo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { books, positions, log, personal } = data;
  const ind = useMemo(() => indicators({ books, positions, log, personal, now }), [books, positions, log, personal, now]);
  const range = useMemo(() => rangeFor(period, now, custom), [period, now, custom]);
  const booksSeries = useMemo(() => (range ? booksOverTime({ books, log, range }) : []), [books, log, range]);
  const pagesSeries = useMemo(() => pagesPerMonth({ books, log, now }), [books, log, now]);
  const cal = useMemo(() => calendar({ books, log, now }), [books, log, now]);
  const dist = useMemo(() => distributions({ books, positions, log, personal, scope }), [books, positions, log, personal, scope]);
  const report = useMemo(() => narrative({ books, positions, log, personal, now }), [books, positions, log, personal, now]);

  if (loading) return <LoadingView message="Calculando suas estatísticas..." />;

  const empty = books.length === 0;
  const customInvalid = period === 'custom' && (custom.from || custom.to) && !range;
  const booksTotal = booksSeries.reduce((s, d) => s + d.value, 0);
  const rows = dimension === 'country' ? [] : dist[dimension];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <Header subtitle="Estatísticas" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <Text style={styles.screenTitle}>Estatísticas de leitura</Text>
        <Text style={styles.lead}>Tudo aqui vem do que você realmente registrou no app. O que ainda não foi medido aparece como indisponível.</Text>

        {error ? <ErrorView title="Falha ao carregar" message={error} onRetry={load} /> : null}

        {empty && !error ? (
          <View style={styles.emptyBox}>
            <Ionicons name="stats-chart-outline" size={30} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sua história de leitura começa aqui</Text>
            <Text style={styles.muted}>Adicione um livro e registre sua leitura. Os números e gráficos aparecem conforme você lê, sem pressa.</Text>
          </View>
        ) : null}

        {!empty && !error ? (
          <>
            <View style={styles.grid}>
              <Tile styles={styles} label="Livros lidos" value={ind.finished} />
              <Tile styles={styles} label="Lendo agora" value={ind.inProgress} />
              <Tile styles={styles} label="Abandonados" value={ind.abandoned} />
              <Tile styles={styles} label="Adicionados" value={ind.added} />
              <Tile styles={styles} label="Páginas lidas" value={formatNumber(ind.pagesRead)} />
              <Tile styles={styles} label="Média de páginas" value={ind.avgPagesFinished === null ? 'Sem dados' : formatNumber(ind.avgPagesFinished)} hint="dos livros lidos" />
              <Tile styles={styles} label="Nota média" value={ind.avgRating === null ? 'Sem notas' : ind.avgRating.toFixed(1).replace('.', ',')} hint={ind.ratingCount ? `${ind.ratingCount} avaliados` : 'avalie livros lidos'} />
              <Tile styles={styles} label="Horas de leitura" value={ind.hours === null ? 'Sem medição' : `${ind.hours} h`} hint={ind.hours === null ? 'após 10 min no leitor' : 'medidas no leitor'} />
              <Tile styles={styles} label="Maior sequência" value={ind.streak.longest ? `${ind.streak.longest} ${ind.streak.longest === 1 ? 'dia' : 'dias'}` : 'Sem dados'} hint={ind.streak.current ? `atual: ${ind.streak.current}` : null} />
              <Tile styles={styles} label="Dias de leitura" value={ind.streak.readingDays} />
            </View>

            {ind.goal ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Meta de {ind.goal.year}</Text>
                <View style={styles.goalTrack}><View style={[styles.goalFill, { width: `${ind.goal.percent}%` }]} /></View>
                <Text style={styles.muted}>{ind.goal.done} de {ind.goal.target} livros ({ind.goal.percent}%)</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Livros concluídos ao longo do tempo</Text>
              <View style={styles.chips}>
                {PERIODS.map((p) => (
                  <Touchable key={p.key} style={[styles.chip, period === p.key && styles.chipOn]} onPress={() => setPeriod(p.key)} accessibilityState={{ selected: period === p.key }}>
                    <Text style={[styles.chipText, period === p.key && styles.chipTextOn]}>{p.label}</Text>
                  </Touchable>
                ))}
              </View>
              {period === 'custom' ? (
                <View style={styles.customRow}>
                  <TextInput style={styles.input} value={custom.from} onChangeText={(t) => setCustom((c) => ({ ...c, from: t }))} placeholder="De (AAAA-MM-DD)" placeholderTextColor={colors.textMuted} maxLength={10} accessibilityLabel="Data inicial" />
                  <TextInput style={styles.input} value={custom.to} onChangeText={(t) => setCustom((c) => ({ ...c, to: t }))} placeholder="Até (AAAA-MM-DD)" placeholderTextColor={colors.textMuted} maxLength={10} accessibilityLabel="Data final" />
                </View>
              ) : null}
              {customInvalid || (period === 'custom' && !custom.from && !custom.to) ? (
                <Text style={styles.muted}>{customInvalid ? 'Use datas válidas no formato AAAA-MM-DD, com a inicial antes da final.' : 'Informe o período que quer ver.'}</Text>
              ) : range ? (
                <>
                  <BarChart data={booksSeries} unit="livros" height={130} />
                  <Text style={styles.muted}>{booksTotal === 0 ? 'Nenhum livro concluído neste período.' : `${booksTotal} ${booksTotal === 1 ? 'livro concluído' : 'livros concluídos'} no período.`}</Text>
                </>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Páginas por mês</Text>
              <BarChart data={pagesSeries} unit="páginas" height={130} />
              <Text style={styles.muted}>Páginas registradas nos últimos 12 meses.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Calendário de leitura</Text>
              <Heatmap cal={cal} styles={styles} colors={colors} />
              <Text style={styles.muted}>{cal.activeDays ? `${cal.activeDays} ${cal.activeDays === 1 ? 'dia com leitura' : 'dias com leitura'} nas últimas 26 semanas.` : 'Os dias em que você ler vão aparecendo aqui. Dias em branco são só descanso.'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Como você lê</Text>
              <View style={styles.chips}>
                {['lidos', 'todos'].map((s) => (
                  <Touchable key={s} style={[styles.chip, scope === s && styles.chipOn]} onPress={() => setScope(s)} accessibilityState={{ selected: scope === s }}>
                    <Text style={[styles.chipText, scope === s && styles.chipTextOn]}>{s === 'lidos' ? 'Livros lidos' : 'Toda a biblioteca'}</Text>
                  </Touchable>
                ))}
              </View>
              <View style={styles.chips}>
                {DIMENSIONS.map((d) => (
                  <Touchable key={d.key} style={[styles.chip, dimension === d.key && styles.chipOn]} onPress={() => setDimension(d.key)} accessibilityState={{ selected: dimension === d.key }}>
                    <Text style={[styles.chipText, dimension === d.key && styles.chipTextOn]}>{d.label}</Text>
                  </Touchable>
                ))}
              </View>
              {dimension === 'country' ? (
                <Text style={styles.muted}>O país de origem dos autores não é informado pelas bibliotecas consultadas, então este recorte não está disponível.</Text>
              ) : rows.length ? (
                <>
                  <Rows rows={rows} styles={styles} />
                  {dist.missing[dimension] ? <Text style={styles.muted}>{dist.missing[dimension]} {dist.missing[dimension] === 1 ? 'livro sem' : 'livros sem'} essa informação ficou fora.</Text> : null}
                </>
              ) : (
                <Text style={styles.muted}>{dist.total === 0 ? 'Ainda não há livros nesse recorte.' : 'Os livros desse recorte não trazem essa informação.'}</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Seu relatório</Text>
              {report.lines.length ? report.lines.map((l) => <Text key={l} style={styles.report}>{l}</Text>) : <Text style={styles.muted}>Ainda não há leitura suficiente para um relatório.</Text>}
              {report.caveats.map((c) => (
                <View key={c} style={styles.caveat}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.warningText} />
                  <Text style={styles.caveatText}>{c}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: 120, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', gap: space.md },
  screenTitle: { fontSize: 22, color: colors.text, fontFamily: fonts.heading },
  lead: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: -6 },
  muted: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  emptyBox: { alignItems: 'center', gap: 8, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
  emptyTitle: { fontSize: 16, color: colors.text, fontFamily: fonts.heading, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexGrow: 1, flexBasis: '30%', minWidth: 100, padding: space.md, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, gap: 2 },
  tileValue: { fontSize: 20, color: colors.primary, fontFamily: fonts.heading },
  tileLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  tileHint: { fontSize: 10, color: colors.textSecondary },
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, gap: space.md },
  cardTitle: { fontSize: 16, color: colors.text, fontFamily: fonts.heading },
  goalTrack: { height: 12, borderRadius: 6, backgroundColor: colors.borderLight, overflow: 'hidden' },
  goalFill: { height: '100%', backgroundColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextOn: { color: colors.onPrimary, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: space.md, fontSize: 13, color: colors.text },
  heatMonths: { flexDirection: 'row', gap: 3, height: 14 },
  heatMonth: { width: 12, fontSize: 9, color: colors.textMuted, overflow: 'visible' },
  heatGrid: { flexDirection: 'row', gap: 3 },
  heatCol: { gap: 3 },
  heatCell: { width: 12, height: 12, borderRadius: 3 },
  heatFuture: { backgroundColor: 'transparent' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.sm },
  legendText: { fontSize: 10, color: colors.textMuted, marginHorizontal: 4 },
  rows: { gap: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { width: 110, fontSize: 12, color: colors.text },
  distTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.borderLight, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: colors.sage },
  distCount: { width: 24, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.text },
  report: { fontSize: 14, lineHeight: 21, color: colors.text },
  caveat: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  caveatText: { flex: 1, fontSize: 12, lineHeight: 16, color: colors.warningText },
});
