import React from 'react';
import { View, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ViewportContext } from './viewport';

const PHONE_WIDTH = 412;
const PHONE_HEIGHT = 892;
const BREAKPOINT = PHONE_WIDTH + 48;

export default function PhoneFrame({ children }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web' || width <= BREAKPOINT) return children;

  const frameHeight = Math.min(PHONE_HEIGHT, height - 32);

  return (
    <View style={[styles.stage, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.phone, { width: PHONE_WIDTH, height: frameHeight, backgroundColor: colors.background, borderColor: colors.border }]}>
        <ViewportContext.Provider value={{ width: PHONE_WIDTH, height: frameHeight }}>
          {children}
        </ViewportContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
  },
});
