import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { READER_THEMES } from '../theme/readerThemes';
import {
  READER_LIMITS,
  WIDTHS,
  PARAGRAPH_GAPS,
  FONT_CHOICES,
  DEFAULT_READER_PREFS,
} from '../services/readerPrefs';
import Touchable from './Touchable';

const TABS = [
  { id: 'look', label: 'Aparência' },
  { id: 'type', label: 'Tipografia' },
  { id: 'space', label: 'Espaçamento' },
  { id: 'read', label: 'Leitura' },
];

function Segmented({ options, value, onChange, styles }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Touchable
          key={o.id}
          style={[styles.segment, value === o.id && styles.segmentOn]}
          onPress={() => onChange(o.id)}
          accessibilityState={{ selected: value === o.id }}
        >
          <Text style={[styles.segmentText, value === o.id && styles.segmentTextOn]} numberOfLines={1}>{o.label}</Text>
        </Touchable>
      ))}
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus, minusDisabled, plusDisabled, styles, colors }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Touchable
          style={[styles.stepBtn, minusDisabled && styles.disabled]}
          onPress={onMinus}
          disabled={minusDisabled}
          accessibilityLabel={`Diminuir ${label}`}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Touchable>
        <Text style={styles.stepValue}>{value}</Text>
        <Touchable
          style={[styles.stepBtn, plusDisabled && styles.disabled]}
          onPress={onPlus}
          disabled={plusDisabled}
          accessibilityLabel={`Aumentar ${label}`}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Touchable>
      </View>
    </View>
  );
}

export default function ReaderSettings({ prefs, onChange, onReset, onClose, preview, previewFont }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState('look');
  const L = READER_LIMITS;

  const widthLabel = WIDTHS.find((w) => w.id === prefs.width)?.label;

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Touchable
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabOn]}
              onPress={() => setTab(t.id)}
              accessibilityState={{ selected: tab === t.id }}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]} numberOfLines={1}>{t.label}</Text>
            </Touchable>
          ))}
        </View>
        <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar ajustes de leitura">
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Touchable>
      </View>

      <View style={[styles.preview, { backgroundColor: preview.background }]}>
        <Text
          numberOfLines={3}
          style={{
            color: preview.text,
            fontSize: prefs.fontSize,
            lineHeight: prefs.fontSize * prefs.lineHeight,
            fontFamily: previewFont,
            textAlign: prefs.align,
          }}
        >
          A tarde caía devagar sobre a estante, e cada página parecia guardar um pouco do silêncio da casa.
        </Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {tab === 'look' && (
          <>
            <Text style={styles.section}>Tema</Text>
            <View style={styles.swatches}>
              <Touchable
                style={[styles.swatch, styles.swatchAuto, prefs.theme === 'auto' && styles.swatchOn]}
                onPress={() => onChange({ theme: 'auto' })}
                accessibilityLabel="Tema automático"
                accessibilityState={{ selected: prefs.theme === 'auto' }}
              >
                <Text style={styles.swatchAutoText}>Auto</Text>
              </Touchable>
              {READER_THEMES.map((t) => (
                <Touchable
                  key={t.id}
                  style={[styles.swatch, { backgroundColor: t.background }, prefs.theme === t.id && styles.swatchOn]}
                  onPress={() => onChange({ theme: t.id })}
                  accessibilityLabel={`Tema ${t.label}`}
                  accessibilityState={{ selected: prefs.theme === t.id }}
                >
                  <Text style={[styles.swatchText, { color: t.text }]}>Aa</Text>
                </Touchable>
              ))}
            </View>
            <Text style={styles.hint}>
              {prefs.theme === 'auto' ? 'Automático segue o tema do aplicativo e o papel escolhido para o livro.' : READER_THEMES.find((t) => t.id === prefs.theme)?.label}
            </Text>

            <Text style={styles.section}>Brilho do leitor</Text>
            <View style={styles.brightRow}>
              <Ionicons name="sunny-outline" size={18} color={colors.textSecondary} />
              <View style={styles.brightSteps}>
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((v) => (
                  <Touchable
                    key={v}
                    style={[styles.brightStep, { backgroundColor: `rgba(0,0,0,${0.04 + v * 1.3})` }, prefs.dim === v && styles.brightStepOn]}
                    onPress={() => onChange({ dim: v })}
                    accessibilityLabel={`Escurecer ${Math.round(v * 100)}%`}
                    accessibilityState={{ selected: prefs.dim === v }}
                  />
                ))}
              </View>
              <Ionicons name="moon-outline" size={18} color={colors.textSecondary} />
            </View>
            <Text style={styles.hint}>Escurece apenas a tela do leitor. O brilho do aparelho não é alterado.</Text>
          </>
        )}

        {tab === 'type' && (
          <>
            <Text style={styles.section}>Fonte</Text>
            <Segmented options={FONT_CHOICES} value={prefs.fontFamily} onChange={(v) => onChange({ fontFamily: v })} styles={styles} />

            <Stepper
              label="Tamanho"
              value={`${prefs.fontSize}`}
              onMinus={() => onChange({ fontSize: prefs.fontSize - 1 })}
              onPlus={() => onChange({ fontSize: prefs.fontSize + 1 })}
              minusDisabled={prefs.fontSize <= L.fontSize.min}
              plusDisabled={prefs.fontSize >= L.fontSize.max}
              styles={styles}
              colors={colors}
            />

            <Text style={styles.section}>Alinhamento</Text>
            <Segmented
              options={[{ id: 'left', label: 'Esquerda' }, { id: 'justify', label: 'Justificado' }]}
              value={prefs.align}
              onChange={(v) => onChange({ align: v })}
              styles={styles}
            />
          </>
        )}

        {tab === 'space' && (
          <>
            <Stepper
              label="Entrelinha"
              value={prefs.lineHeight.toFixed(1)}
              onMinus={() => onChange({ lineHeight: prefs.lineHeight - 0.1 })}
              onPlus={() => onChange({ lineHeight: prefs.lineHeight + 0.1 })}
              minusDisabled={prefs.lineHeight <= L.lineHeight.min + 0.01}
              plusDisabled={prefs.lineHeight >= L.lineHeight.max - 0.01}
              styles={styles}
              colors={colors}
            />
            <Stepper
              label="Margens"
              value={`${prefs.margin}`}
              onMinus={() => onChange({ margin: prefs.margin - 4 })}
              onPlus={() => onChange({ margin: prefs.margin + 4 })}
              minusDisabled={prefs.margin <= L.margin.min}
              plusDisabled={prefs.margin >= L.margin.max}
              styles={styles}
              colors={colors}
            />

            <Text style={styles.section}>Entre parágrafos</Text>
            <Segmented options={PARAGRAPH_GAPS} value={prefs.paragraphGap} onChange={(v) => onChange({ paragraphGap: v })} styles={styles} />

            <Text style={styles.section}>Largura do texto</Text>
            <Segmented options={WIDTHS} value={prefs.width} onChange={(v) => onChange({ width: v })} styles={styles} />
            <Text style={styles.hint}>
              {prefs.width === 'total' ? 'O texto ocupa toda a largura disponível.' : `Coluna ${widthLabel?.toLowerCase()}; em telas de celular o efeito aparece só quando a tela é mais larga.`}
            </Text>
          </>
        )}

        {tab === 'read' && (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.rowLabel}>Ocultar menus ao ler</Text>
                <Text style={styles.hint}>Os controles somem após alguns segundos. Toque no texto para mostrá-los.</Text>
              </View>
              <Switch
                value={prefs.autoHide}
                onValueChange={(v) => onChange({ autoHide: v })}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel="Ocultar menus ao ler"
              />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.rowLabel}>Manter a tela ativa</Text>
                <Text style={styles.hint}>Evita que a tela apague enquanto você lê, onde o aparelho permitir.</Text>
              </View>
              <Switch
                value={prefs.keepAwake}
                onValueChange={(v) => onChange({ keepAwake: v })}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel="Manter a tela ativa"
              />
            </View>

            <Touchable style={styles.reset} onPress={onReset} accessibilityLabel="Restaurar configurações originais">
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text style={styles.resetText}>Restaurar configurações originais</Text>
            </Touchable>
            <Text style={styles.hint}>
              Original: fonte do livro, tamanho {DEFAULT_READER_PREFS.fontSize}, tema automático.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    height: '52%',
    maxHeight: 460,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 12,
    paddingTop: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 2,
  },
  tabOn: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextOn: {
    color: colors.onPrimary,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  preview: {
    marginHorizontal: space.md,
    marginTop: space.md,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: space.lg,
    paddingBottom: space.xxl,
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: space.sm,
  },
  segmented: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  segmentOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  segmentTextOn: {
    color: colors.onPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  stepValue: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  disabled: {
    opacity: 0.35,
  },
  swatches: {
    flexDirection: 'row',
    gap: space.sm + 2,
  },
  swatch: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchAuto: {
    backgroundColor: colors.surfaceSoft,
  },
  swatchOn: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  swatchText: {
    fontSize: 18,
    fontWeight: '700',
  },
  swatchAutoText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  brightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
  },
  brightSteps: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  brightStep: {
    flex: 1,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  brightStepOn: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  switchText: {
    flex: 1,
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    marginTop: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
