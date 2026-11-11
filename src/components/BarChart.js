import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

export default function BarChart({ data, height = 120, unit = 'páginas', highlightLast = true }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  const summary = data.map((d) => `${d.label}: ${d.value} ${unit}`).join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Gráfico de ${unit}. ${summary}`}>
      <View style={[styles.plot, { height }]}>
        {data.map((d, index) => {
          const isLast = highlightLast && index === data.length - 1;
          const barHeight = d.value > 0 ? Math.max(4, Math.round((d.value / max) * (height - 18))) : 2;
          return (
            <View key={d.key} style={styles.column}>
              {d.value > 0 && <Text style={[styles.value, { color: colors.textSecondary }]}>{d.value}</Text>}
              <View
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: barHeight,
                  borderRadius: radius.sm / 2,
                  backgroundColor: d.value > 0 ? (isLast ? colors.primary : colors.sage) : colors.borderLight,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={[styles.axis, { borderTopColor: colors.borderLight }]}>
        {data.map((d) => (
          <Text key={d.key} style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  value: {
    fontSize: 10,
    marginBottom: 3,
    fontWeight: '600',
  },
  axis: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
});
