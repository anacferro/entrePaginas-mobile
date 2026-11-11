import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai } from '../services/ai';
import { storage } from '../services/storage';
import { isMapValid } from '../services/readingAssistant';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';

const GRAPH_HEIGHT = 300;
const NODE = 52;
const MAX_NODES = 10;

const TYPE_LABELS = {
  parentesco: 'Parentesco',
  amizade: 'Amizade',
  amor: 'Amor',
  rivalidade: 'Rivalidade',
  alianca: 'Aliança',
  trabalho: 'Trabalho',
  outro: 'Outro vínculo',
};

const TYPE_COLORS = {
  parentesco: '#7A5233',
  amizade: '#527A5B',
  amor: '#B5473F',
  rivalidade: '#7A2E26',
  alianca: '#244C3A',
  trabalho: '#1F3347',
  outro: '#8A8473',
};

const initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

function Edge({ a, b, color, dashed }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (a.x + b.x) / 2 - length / 2,
        top: (a.y + b.y) / 2 - 1,
        width: length,
        height: 0,
        borderTopWidth: 2,
        borderColor: color,
        borderStyle: dashed ? 'dashed' : 'solid',
        opacity: dashed ? 0.7 : 0.9,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
      }}
    />
  );
}

export default function CharacterMap({ bookId, chapters, pages, limitIndex, onGoToPage }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [map, setMap] = useState(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    let active = true;
    setChecked(false);
    storage.getCharacterMap(bookId)
      .then((saved) => {
        if (!active) return;
        setMap(isMapValid(saved, chapters, pages, limitIndex) ? saved : null);
        setChecked(true);
      })
      .catch(() => active && setChecked(true));
    return () => {
      active = false;
    };
  }, [bookId, chapters, pages, limitIndex]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const built = await ai.characters({ chapters, pages, limitIndex });
      await storage.setCharacterMap(bookId, built);
      setMap(built);
      setSelectedId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [bookId, chapters, pages, limitIndex]);

  const nodes = useMemo(() => {
    if (!map) return [];
    const list = map.characters.slice(0, MAX_NODES);
    const cx = width / 2;
    const cy = GRAPH_HEIGHT / 2;
    const rx = Math.max(60, width / 2 - NODE / 2 - 14);
    const ry = GRAPH_HEIGHT / 2 - NODE / 2 - 22;
    return list.map((c, i) => {
      if (list.length === 1) return { ...c, x: cx, y: cy };
      const angle = -Math.PI / 2 + (i / list.length) * Math.PI * 2;
      return { ...c, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
    });
  }, [map, width]);

  const byId = useMemo(() => Object.fromEntries((map?.characters || []).map((c) => [c.id, c])), [map]);
  const posById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = selectedId ? byId[selectedId] : null;
  const selectedRelations = selected
    ? map.relations.filter((r) => r.from === selected.id || r.to === selected.id)
    : [];
  const usedTypes = map ? [...new Set(map.relations.map((r) => r.type))] : [];

  if (!checked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!map || busy) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={40} color={colors.secondary} />
        <Text style={styles.heading}>Mapa de personagens</Text>
        <Text style={styles.hint}>
          A IA lê só o que você já leu, até a folha {limitIndex + 1}, e monta os personagens e as relações que o texto mostra.
        </Text>
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>Lendo o texto e conferindo cada personagem...</Text>
          </View>
        ) : (
          <Touchable style={styles.primaryBtn} onPress={generate} accessibilityLabel="Gerar mapa de personagens">
            <Ionicons name="sparkles" size={16} color={colors.onPrimary} />
            <Text style={styles.primaryText}>Gerar mapa até a folha {limitIndex + 1}</Text>
          </Touchable>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  const outdated = map.upToIndex < limitIndex;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {map.characters.length === 0 ? (
        <Text style={styles.hint}>Ainda não há personagens claros no que foi lido.</Text>
      ) : (
        <View style={styles.graph} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {map.relations.map((r, i) => {
            const a = posById[r.from];
            const b = posById[r.to];
            if (!a || !b) return null;
            return <Edge key={i} a={a} b={b} color={TYPE_COLORS[r.type]} dashed={!r.confirmed} />;
          })}
          {nodes.map((n) => (
            <Touchable
              key={n.id}
              style={[styles.node, { left: n.x - NODE / 2, top: n.y - NODE / 2 }, selectedId === n.id && styles.nodeOn]}
              onPress={() => setSelectedId(selectedId === n.id ? null : n.id)}
              accessibilityLabel={`Personagem ${n.name}`}
              accessibilityState={{ selected: selectedId === n.id }}
            >
              <Text style={[styles.nodeText, selectedId === n.id && styles.nodeTextOn]}>{initials(n.name)}</Text>
            </Touchable>
          ))}
          {nodes.map((n) => (
            <Text key={`l${n.id}`} pointerEvents="none" style={[styles.nodeName, { left: n.x - 44, top: n.y + NODE / 2 + 1 }]} numberOfLines={1}>
              {n.name}
            </Text>
          ))}
        </View>
      )}

      {usedTypes.length > 0 && (
        <View style={styles.legend}>
          {usedTypes.map((t) => (
            <View key={t} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TYPE_COLORS[t] }]} />
              <Text style={styles.legendText}>{TYPE_LABELS[t]}</Text>
            </View>
          ))}
          <Text style={styles.legendText}>Linha tracejada: não confirmado</Text>
        </View>
      )}

      {selected ? (
        <View style={styles.detail}>
          <Text style={styles.detailName}>{selected.name}</Text>
          {selected.names.length > 1 && (
            <Text style={styles.aka}>Também chamado: {selected.names.slice(1).join(', ')}</Text>
          )}
          {!!selected.description && <Text style={styles.body}>{selected.description}</Text>}
          {!!selected.personality && <Text style={styles.body}><Text style={styles.strong}>Personalidade: </Text>{selected.personality}</Text>}
          {!!selected.importance && <Text style={styles.body}><Text style={styles.strong}>Na história: </Text>{selected.importance}</Text>}
          {selected.traits.length > 0 && (
            <View style={styles.traits}>
              {selected.traits.map((t) => (
                <View key={t} style={styles.trait}><Text style={styles.traitText}>{t}</Text></View>
              ))}
            </View>
          )}

          <Text style={styles.sub}>Relações</Text>
          {selectedRelations.length === 0 && <Text style={styles.hint}>Nenhuma relação clara até aqui.</Text>}
          {selectedRelations.map((r, i) => {
            const other = byId[r.from === selected.id ? r.to : r.from];
            return (
              <View key={i} style={styles.relation}>
                <View style={[styles.legendDot, { backgroundColor: TYPE_COLORS[r.type] }]} />
                <View style={styles.flex}>
                  <Text style={styles.body}>
                    <Text style={styles.strong}>{other?.name}</Text> · {TYPE_LABELS[r.type]}
                    {!r.confirmed && <Text style={styles.unconfirmed}> · não confirmado</Text>}
                  </Text>
                  {!!r.description && <Text style={styles.small}>{r.description}</Text>}
                  {r.proof && (
                    <Touchable onPress={() => onGoToPage(r.proof.pageIndex)} accessibilityLabel={`Ir para ${r.proof.label}`}>
                      <Text style={styles.link}>{r.proof.label}</Text>
                    </Touchable>
                  )}
                </View>
              </View>
            );
          })}

          <Text style={styles.sub}>Acontecimentos</Text>
          {selected.events.length === 0 && <Text style={styles.hint}>Nenhum acontecimento confirmado no texto até aqui.</Text>}
          {selected.events.map((e, i) => (
            <Touchable key={i} style={styles.event} onPress={() => onGoToPage(e.pageIndex)} accessibilityLabel={`Ir para ${e.label}`}>
              <Text style={styles.body}>{e.summary}</Text>
              <Text style={styles.link}>{e.label}</Text>
            </Touchable>
          ))}
        </View>
      ) : (
        map.characters.length > 0 && <Text style={styles.hint}>Toque em um personagem para ver detalhes, relações e acontecimentos.</Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.small}>
          Mapa até a folha {map.upToIndex + 1}.{outdated ? ' Você avançou desde então.' : ''}
          {' '}Gerado por IA a partir do texto; só entram nomes e trechos conferidos no livro.
        </Text>
        <Touchable style={styles.secondaryBtn} onPress={generate} accessibilityLabel="Atualizar mapa de personagens">
          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryText}>{outdated ? `Atualizar até a folha ${limitIndex + 1}` : 'Gerar de novo'}</Text>
        </Touchable>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
  },
  heading: { fontSize: 18, color: colors.text, fontFamily: fonts.heading },
  hint: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' },
  busy: { alignItems: 'center', gap: space.sm },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  error: { fontSize: 13, lineHeight: 19, color: colors.danger, textAlign: 'center' },
  graph: {
    height: GRAPH_HEIGHT,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  node: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  nodeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  nodeText: { fontSize: 15, color: colors.text, fontFamily: fonts.heading },
  nodeTextOn: { color: colors.onPrimary },
  nodeName: {
    position: 'absolute',
    width: 88,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  legendText: { fontSize: 11, color: colors.textSecondary },
  detail: {
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: space.sm,
  },
  detailName: { fontSize: 20, color: colors.text, fontFamily: fonts.heading },
  aka: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  body: { fontSize: 14, lineHeight: 20, color: colors.text },
  small: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  strong: { fontWeight: '700' },
  unconfirmed: { color: colors.danger, fontWeight: '700' },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  trait: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  traitText: { fontSize: 12, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, fontWeight: '700', color: colors.secondary, marginTop: space.sm },
  relation: { flexDirection: 'row', gap: space.sm },
  event: { paddingLeft: space.md, borderLeftWidth: 3, borderLeftColor: colors.secondary, gap: 2 },
  link: { fontSize: 11, fontWeight: '700', color: colors.secondary },
  footer: { gap: space.sm, marginTop: space.sm },
});
