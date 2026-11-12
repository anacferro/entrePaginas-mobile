import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/components/Toast';
import PhoneFrame from './src/components/PhoneFrame';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Lora_600SemiBold, Lora_700Bold });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <PhoneFrame>
          <AuthProvider>
            <ToastProvider>
              <AppNavigator />
            </ToastProvider>
          </AuthProvider>
        </PhoneFrame>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
