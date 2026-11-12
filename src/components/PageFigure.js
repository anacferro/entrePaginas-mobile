import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useViewport } from './viewport';

export default function PageFigure({ uri, ratio, label, maxShare = 0.7, fallbackHeight = 280, style }) {
  const { height } = useViewport();
  const limit = Math.round(height * maxShare);
  return (
    <View style={[styles.box, style]}>
      <Image
        source={{ uri }}
        style={ratio ? { width: '100%', aspectRatio: ratio, maxHeight: limit } : { width: '100%', height: Math.min(fallbackHeight, limit) }}
        resizeMode="contain"
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 14,
  },
});
