import React, { useEffect } from 'react';
import { authService } from './src/services/auth';
import './src/webStyles';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/components/Toast';
import AppDialog from './src/components/AppDialog';
import PhoneFrame from './src/components/PhoneFrame';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Lora_600SemiBold, Lora_700Bold });

  useEffect(() => authService.listenForLoginLink(), []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <PhoneFrame>
          <AuthProvider>
            <ToastProvider>
              <AppNavigator />
              <AppDialog />
            </ToastProvider>
          </AuthProvider>
        </PhoneFrame>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
