import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import Touchable from './Touchable';

export default function StarRating({ value = 0, onChange, size = 28, gap = 4 }) {
  const { colors } = useTheme();
  const stars = [1, 2, 3, 4, 5];
  const interactive = typeof onChange === 'function';

  return (
    <View
      style={[styles.row, { gap }]}
      accessibilityRole={interactive ? 'adjustable' : 'text'}
      accessibilityLabel={value ? `Nota ${value} de 5` : 'Sem nota'}
    >
      {stars.map((n) => {
        const icon = <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? colors.warning : colors.textMuted} />;
        if (!interactive) return <View key={n}>{icon}</View>;
        return (
          <Touchable
            key={n}
            onPress={() => onChange(n === value ? 0 : n)}
            accessibilityLabel={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
          >
            {icon}
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
