import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space, shadow } from '../theme/tokens';
import Touchable from './Touchable';
import ProgressBar from './ProgressBar';
import BarChart from './BarChart';
import EmptyView from './EmptyView';
import { SkeletonCards } from './Skeleton';
import {
  computeStats,
  recentActivity,
  formatDuration,
  formatNumber,
  formatRelative,
  STATUS,
} from '../services/readingStats';

const ACTIVITY = {
  added: { icon: 'add-circle-outline', text: () => 'Adicionado à estante' },
  started: { icon: 'book-outline', text: () => 'Começou a ler' },
  finished: { icon: 'checkmark-circle-outline', text: () => 'Concluiu a leitura' },
  progress: { icon: 'bookmark-outline', text: (e) => `Leu até a página ${e.page}` },
};

function Tile({ icon, label, value, hint, styles, colors }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
}

function GoalModal({ visible, current, onClose, onSave, styles, colors }) {
  const [value, setValue] = useState(current || 12);

  React.useEffect(() => {
    if (visible) setValue(current || 12);
  }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Meta de leitura</Text>
          <Text style={styles.sheetText}>Quantos livros você quer concluir em {new Date().getFullYear()}?</Text>
          <View style={styles.stepper}>
            <Touchable
              style={styles.stepBtn}
              onPress={() => setValue(Math.max(1, value - 1))}
              accessibilityLabel="Diminuir meta"
            >
              <Ionicons name="remove" size={22} color={colors.primary} />
            </Touchable>
            <Text style={styles.stepValue}>{value}</Text>
            <Touchable
              style={styles.stepBtn}
              onPress={() => setValue(Math.min(365, value + 1))}
              accessibilityLabel="Aumentar meta"
            >
              <Ionicons name="add" size={22} color={colors.primary} />
            </Touchable>
          </View>
          <View style={styles.sheetActions}>
            {current ? (
              <Touchable style={styles.ghostBtn} onPress={() => onSave(0)}>
                <Text style={styles.ghostText}>Remover meta</Text>
              </Touchable>
            ) : (
              <Touchable style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostText}>Cancelar</Text>
              </Touchable>
            )}
            <Touchable style={styles.primaryBtn} onPress={() => onSave(value)}>
              <Text style={styles.primaryText}>Salvar</Text>
            </Touchable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ReadingDashboard({ books, positions, log, loading, onSaveGoal, onCreate, onOpenBook }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [range, setRange] = useState('daily');
  const [goalOpen, setGoalOpen] = useState(false);

  const { stats, activity, now } = useMemo(() => {
    const at = new Date();
    return {
      now: at,
      stats: computeStats({ books, positions, log, now: at }),
      activity: recentActivity({ books, positions, log }),
    };
  }, [books, positions, log]);

  if (loading) return <SkeletonCards count={3} height={110} />;

  if (books.length === 0) {
    return (
      <EmptyView
        icon="stats-chart-outline"
        title="Seu painel de leitura começa aqui"
        description="Adicione um livro à estante e comece a ler. As estatísticas aparecem conforme você avança nas páginas."
        actionLabel="Criar ou importar livro"
        onActionPress={onCreate}
      />
    );
  }

  const { counts, comparison } = stats;
  const series = range === 'daily' ? stats.daily : stats.monthly;
  const monthDiff = comparison.lastMonth > 0
    ? Math.round(((comparison.thisMonth - comparison.lastMonth) / comparison.lastMonth) * 100)
    : null;

  const saveGoal = (target) => {
    setGoalOpen(false);
    onSaveGoal(target);
  };

  return (
    <View>
      <View style={styles.statusRow}>
        {[
          { key: STATUS.FINISHED, label: 'Lidos', icon: 'checkmark-circle-outline' },
          { key: STATUS.READING, label: 'Em andamento', icon: 'book-outline' },
          { key: STATUS.PLANNED, label: 'Planejados', icon: 'bookmark-outline' },
        ].map((item) => (
          <View key={item.key} style={styles.statusBox}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
            <Text style={styles.statusNumber}>{counts[item.key]}</Text>
            <Text style={styles.statusLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tilesRow}>
        <Tile
          icon="document-text-outline"
          label="Páginas lidas"
          value={formatNumber(stats.pagesRead)}
          hint={stats.pagesToday > 0 ? `${formatNumber(stats.pagesToday)} hoje` : null}
          styles={styles}
          colors={colors}
        />
        <Tile
          icon="time-outline"
          label="Tempo lendo"
          value={formatDuration(stats.seconds)}
          hint={stats.secondsWeek > 0 ? `${formatDuration(stats.secondsWeek)} na semana` : null}
          styles={styles}
          colors={colors}
        />
        <Tile
          icon="speedometer-outline"
          label="Páginas por dia"
          value={formatNumber(stats.pagesPerDay, stats.pagesPerDay < 10 ? 1 : 0)}
          hint="média dos últimos 30 dias"
          styles={styles}
          colors={colors}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Evolução</Text>
          <View style={styles.segment}>
            {[
              { key: 'daily', label: '14 dias' },
              { key: 'monthly', label: '6 meses' },
            ].map((item) => (
              <Touchable
                key={item.key}
                style={[styles.segmentBtn, range === item.key && styles.segmentOn]}
                onPress={() => setRange(item.key)}
                accessibilityState={{ selected: range === item.key }}
              >
                <Text style={[styles.segmentText, range === item.key && styles.segmentTextOn]}>{item.label}</Text>
              </Touchable>
            ))}
          </View>
        </View>
        {stats.hasActivity ? (
          <>
            <BarChart data={series} />
            <Text style={styles.caption}>Páginas lidas por {range === 'daily' ? 'dia' : 'mês'}</Text>
          </>
        ) : (
          <Text style={styles.muted}>
            Ainda não há leitura registrada. Abra um livro e avance as páginas para ver sua evolução.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comparativo</Text>
        <View style={styles.compareRow}>
          <View style={styles.compareCell}>
            <Text style={styles.compareValue}>{formatNumber(comparison.thisMonth)}</Text>
            <Text style={styles.compareLabel}>páginas este mês</Text>
            <Text style={styles.compareHint}>
              {comparison.lastMonth > 0
                ? `${monthDiff >= 0 ? '+' : ''}${monthDiff}% sobre o mês passado (${formatNumber(comparison.lastMonth)})`
                : 'sem leitura no mês passado'}
            </Text>
          </View>
          <View style={styles.compareCell}>
            <Text style={styles.compareValue}>{comparison.finishedThisYear}</Text>
            <Text style={styles.compareLabel}>livros concluídos neste ano</Text>
            <Text style={styles.compareHint}>
              {comparison.finishedLastYear > 0
                ? `${comparison.finishedLastYear} no ano passado`
                : 'sem conclusões no ano passado'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Meta de leitura</Text>
          <Touchable style={styles.linkBtn} onPress={() => setGoalOpen(true)}>
            <Ionicons name={stats.goal ? 'create-outline' : 'flag-outline'} size={15} color={colors.primary} />
            <Text style={styles.linkText}>{stats.goal ? 'Editar' : 'Definir meta'}</Text>
          </Touchable>
        </View>
        {stats.goal ? (
          <>
            <View style={styles.goalNumbers}>
              <Text style={styles.goalDone}>{stats.goal.done}</Text>
              <Text style={styles.goalTarget}> de {stats.goal.target} livros em {stats.goal.year}</Text>
            </View>
            <ProgressBar
              value={stats.goal.done / stats.goal.target}
              height={10}
              label="Progresso da meta de leitura"
            />
            <Text style={styles.caption}>
              {stats.goal.remaining > 0
                ? `Faltam ${stats.goal.remaining} ${stats.goal.remaining === 1 ? 'livro' : 'livros'} para chegar lá.`
                : 'Meta alcançada. Parabéns!'}
            </Text>
          </>
        ) : (
          <Text style={styles.muted}>
            Defina quantos livros quer concluir neste ano e acompanhe o quanto falta.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Atividade recente</Text>
        {activity.length === 0 ? (
          <Text style={styles.muted}>Nenhuma atividade ainda.</Text>
        ) : (
          activity.map((event) => {
            const meta = ACTIVITY[event.kind];
            return (
              <Touchable
                key={event.id}
                style={styles.activityRow}
                onPress={() => onOpenBook(event.bookId)}
                accessibilityLabel={`${event.title}. ${meta.text(event)}`}
              >
                <View style={styles.activityIcon}>
                  <Ionicons name={meta.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.activityBody}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.activityText}>{meta.text(event)}</Text>
                </View>
                <Text style={styles.activityWhen}>{formatRelative(event.at, now)}</Text>
              </Touchable>
            );
          })
        )}
      </View>

      <GoalModal
        visible={goalOpen}
        current={stats.goal?.target || 0}
        onClose={() => setGoalOpen(false)}
        onSave={saveGoal}
        styles={styles}
        colors={colors}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    gap: space.sm + 2,
    marginBottom: space.md,
  },
  statusBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md + 2,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  statusNumber: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    fontFamily: fonts.heading,
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  tilesRow: {
    flexDirection: 'row',
    gap: space.sm + 2,
    marginBottom: space.md,
  },
  tile: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    gap: 2,
  },
  tileValue: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    fontFamily: fonts.heading,
    marginTop: 4,
  },
  tileLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tileHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: space.md,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    gap: space.sm,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 2,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minHeight: 30,
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextOn: {
    color: colors.onPrimary,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: space.sm + 2,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  compareRow: {
    flexDirection: 'row',
    gap: space.lg,
    marginTop: space.sm,
  },
  compareCell: {
    flex: 1,
  },
  compareValue: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.primary,
    fontFamily: fonts.heading,
  },
  compareLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  compareHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  goalNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: space.sm + 2,
    flexWrap: 'wrap',
  },
  goalDone: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.primary,
    fontFamily: fonts.heading,
  },
  goalTarget: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  activityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityWhen: {
    fontSize: 11,
    color: colors.textMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetTitle: {
    fontSize: 20,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  sheetText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    marginVertical: space.xl,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 40,
    lineHeight: 46,
    color: colors.primary,
    fontFamily: fonts.heading,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: space.md,
  },
  ghostBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
