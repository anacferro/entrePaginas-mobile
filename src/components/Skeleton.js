import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { useShelfLayout } from './BookCover';

export function SkeletonBlock({ width = '100%', height = 16, borderRadius = radius.sm, style }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: colors.surfaceSoft, opacity }, style]} />;
}

export function SkeletonShelf({ count = 6 }) {
  const { coverWidth, cellWidth } = useShelfLayout();
  return (
    <View style={styles.grid} accessibilityLabel="Carregando livros" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.cell, { width: cellWidth }]}>
          <SkeletonBlock width={coverWidth} height={coverWidth * 1.45} borderRadius={radius.md} />
          <SkeletonBlock width={coverWidth * 0.8} height={12} style={styles.line} />
          <SkeletonBlock width={coverWidth * 0.5} height={10} style={styles.line} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonCards({ count = 3, height = 96 }) {
  return (
    <View accessibilityLabel="Carregando" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} height={height} borderRadius={radius.lg} style={styles.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    alignItems: 'center',
    marginBottom: 22,
  },
  line: {
    marginTop: 8,
  },
  card: {
    marginBottom: 12,
  },
});
