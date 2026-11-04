import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';

const HOVER_OPACITY = 0.82;
const PRESSED_OPACITY = 0.62;

export default function Touchable({ style, activeOpacity, disabled, children, ...rest }) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole={rest.accessibilityRole || 'button'}
      {...rest}
      style={(state) => {
        const base = StyleSheet.flatten(typeof style === 'function' ? style(state) : style) || {};
        const baseOpacity = base.opacity ?? 1;
        const factor = state.pressed ? PRESSED_OPACITY : state.hovered ? HOVER_OPACITY : 1;
        return [
          base,
          { opacity: baseOpacity * factor },
          Platform.OS === 'web' && !disabled ? { cursor: 'pointer' } : null,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}
