import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

const SPINES = [
  { height: 92, width: 22 },
  { height: 120, width: 26 },
  { height: 104, width: 20 },
  { height: 134, width: 28 },
  { height: 98, width: 24 },
];

function useEntrance(delay) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      duration: 650,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [value, delay]);
  return {
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const heroAnim = useEntrance(0);
  const cardAnim = useEntrance(220);

  const handleGoogle = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.hero[0]} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <LinearGradient colors={colors.hero} style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroSafe}>
            <Animated.View style={[styles.heroContent, heroAnim]}>
              <View style={styles.spines}>
                {SPINES.map((spine, index) => (
                  <View
                    key={index}
                    style={[
                      styles.spine,
                      {
                        height: spine.height,
                        width: spine.width,
                        backgroundColor: colors.heroSpines[index],
                      },
                    ]}
                  >
                    <View style={styles.spineBand} />
                  </View>
                ))}
              </View>
              <View style={styles.shelf} />

              <Text style={styles.brandTitle}>Entre Páginas</Text>
              <Text style={styles.brandTagline}>
                Sua estante particular, criada e personalizada página por página.
              </Text>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        <Animated.View style={[styles.sheet, cardAnim]}>
          <Text style={styles.formTitle}>Bem-vindo de volta</Text>
          <Text style={styles.formHint}>
            Entre com a sua conta Google. Seus livros ficam salvos na sua conta e acompanham você em qualquer aparelho.
          </Text>

          {!authService.isConfigured && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={16} color={colors.warningText} />
              <Text style={styles.warningText}>
                O Firebase não está configurado. Preencha o arquivo .env conforme o README.
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.googleButtonDisabled]}
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continuar com o Google"
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <View style={styles.googleBadge}>
                  <Ionicons name="logo-google" size={16} color={colors.primary} />
                </View>
                <Text style={styles.googleText}>Continuar com o Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
            <Text style={styles.trustText}>Não guardamos sua senha. O acesso é feito pelo Google.</Text>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Ionicons name="cloud-done-outline" size={18} color={colors.primary} />
              <Text style={styles.featureText}>Nuvem</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.feature}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <Text style={styles.featureText}>Resumos com IA</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.feature}>
              <Ionicons name="moon-outline" size={18} color={colors.primary} />
              <Text style={styles.featureText}>Modo escuro</Text>
            </View>
          </View>

          <Text style={styles.copyrightText}>Entre Páginas © 2025 • Edição de Colecionador</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
  },
  hero: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  heroSafe: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: 36,
  },
  spines: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  spine: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    justifyContent: 'flex-start',
    paddingTop: 14,
  },
  spineBand: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  shelf: {
    width: 190,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 26,
  },
  brandTitle: {
    fontFamily: 'serif',
    fontSize: 36,
    fontWeight: '700',
    color: colors.heroText,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  brandTagline: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: colors.heroTextMuted,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },
  sheet: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },
  formTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  formHint: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.warningText,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  googleButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  trustText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  features: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 28,
  },
  feature: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  featureDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  copyrightText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 28,
  },
});
