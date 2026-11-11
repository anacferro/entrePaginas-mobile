import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadow, motion } from '../theme/tokens';

const ToastContext = createContext({ show: () => {} });

const KINDS = {
  success: { icon: 'checkmark-circle', color: 'success', bg: 'successLight', border: 'successBorder' },
  error: { icon: 'alert-circle', color: 'danger', bg: 'dangerLight', border: 'dangerBorder' },
  info: { icon: 'information-circle', color: 'primary', bg: 'primaryLight', border: 'borderLight' },
};

export function ToastProvider({ children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const [progress] = useState(() => new Animated.Value(0));
  const timer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(progress, { toValue: 0, duration: motion.fast, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [progress]);

  const show = useCallback((message, kind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind, id: Date.now() });
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
    timer.current = setTimeout(hide, kind === 'error' ? 5000 : 2800);
  }, [hide, progress]);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show }), [show]);
  const style = toast ? KINDS[toast.kind] || KINDS.info : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.wrap,
            { top: insets.top + 12, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] },
          ]}
        >
          <View style={[styles.toast, shadow.raised, { backgroundColor: colors[style.bg], borderColor: colors[style.border] }]}>
            <Ionicons name={style.icon} size={20} color={colors[style.color]} />
            <Text style={[styles.text, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 520,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  text: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
});
