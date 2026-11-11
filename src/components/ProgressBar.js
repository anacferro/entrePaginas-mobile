import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { motion } from '../theme/tokens';

export default function ProgressBar({ value = 0, height = 8, color, trackColor, label, style }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, value || 0));
  const [width] = useState(() => new Animated.Value(clamped));

  useEffect(() => {
    Animated.timing(width, { toValue: clamped, duration: motion.base, useNativeDriver: false }).start();
  }, [clamped, width]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor || colors.borderLight }, style]}
    >
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color || colors.primary,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
