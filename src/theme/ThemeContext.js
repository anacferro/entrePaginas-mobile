import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './palettes';

const STORAGE_KEY = '@entre_paginas_theme_v1';
const MODES = ['system', 'light', 'dark'];

const ThemeContext = createContext({
  colors: lightColors,
  isDark: false,
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (MODES.includes(saved)) setModeState(saved);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setMode = useCallback(async (next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const isDark = mode === 'system' ? scheme === 'dark' : mode === 'dark';

  const value = useMemo(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, mode, setMode }),
    [isDark, mode, setMode]
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeScope({ dark, children }) {
  const parent = useContext(ThemeContext);
  const value = useMemo(
    () => ({ ...parent, colors: dark ? darkColors : lightColors, isDark: dark }),
    [parent, dark]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemedStyles(create) {
  const { colors } = useContext(ThemeContext);
  return useMemo(() => create(colors), [create, colors]);
}
