import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';
import { dialog } from '../services/dialog';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSignUp = mode === 'signup';

  const switchMode = () => {
    setMode(isSignUp ? 'signin' : 'signup');
    setError(null);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) await authService.signUp(name, email, password);
      else await authService.signIn(email, password);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Informe o e-mail para receber o link de redefinição.');
      return;
    }
    try {
      await authService.resetPassword(email);
      dialog.alert('Verifique seu e-mail', 'Enviamos um link para redefinir a senha, se o e-mail estiver cadastrado.');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <View style={styles.iconEmblem}>
              <Ionicons name="book" size={38} color={colors.primary} />
              <View style={styles.sparkleBadge}>
                <Ionicons name="sparkles" size={14} color={colors.accentGold} />
              </View>
            </View>

            <Text style={styles.brandTitle}>Entre Páginas</Text>
            <Text style={styles.brandTagline}>
              Sua estante particular, criada e personalizada página por página.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>{isSignUp ? 'Criar sua conta' : 'Entrar na sua estante'}</Text>

            {!authService.isConfigured && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={16} color="#8A6420" />
                <Text style={styles.warningText}>
                  O Firebase não está configurado. Preencha o arquivo .env conforme o README.
                </Text>
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  accessibilityLabel="Nome"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="E-mail"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={handleSubmit}
                accessibilityLabel="Senha"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityLabel={isSignUp ? 'Criar conta' : 'Entrar'}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>{isSignUp ? 'Criar conta' : 'Entrar'}</Text>
              )}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity onPress={handleReset} style={styles.linkButton}>
                <Text style={styles.linkText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={switchMode} style={styles.linkButton}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Já tem conta? ' : 'Ainda não tem conta? '}
                <Text style={styles.linkText}>{isSignUp ? 'Entrar' : 'Criar conta'}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.legalLinks}>Termos de Uso  •  Política de Privacidade</Text>
            <Text style={styles.copyrightText}>Entre Páginas © 2025 • Edição de Colecionador</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  iconEmblem: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 22,
    position: 'relative',
  },
  sparkleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'serif',
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'serif',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 290,
  },
  formSection: {
    width: '100%',
    marginVertical: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'serif',
    marginBottom: 14,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FBF1DF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#8A6420',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  switchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerSection: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  legalLinks: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 6,
  },
  copyrightText: {
    fontSize: 11,
    color: colors.textMuted,
    opacity: 0.8,
  },
});
