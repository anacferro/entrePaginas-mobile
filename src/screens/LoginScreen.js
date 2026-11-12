import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import Touchable from '../components/Touchable';
import { fonts } from '../theme/tokens';

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

function useFloat(duration) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return {
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }],
  };
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const heroAnim = useEntrance(0);
  const cardAnim = useEntrance(220);
  const floatCard = useFloat(6000);
  const floatPill = useFloat(7500);

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
          <View style={styles.blobA} />
          <View style={styles.blobB} />
          <SafeAreaView edges={['top']} style={styles.heroSafe}>
            <Animated.View style={[styles.heroContent, heroAnim]}>
              <View style={styles.brandRow}>
                <View style={styles.logo}>
                  <Ionicons name="book" size={22} color={colors.onPrimary} />
                </View>
                <Text style={styles.brandName}>Entre Páginas</Text>
              </View>

              <Text style={styles.headline}>
                Sua estante particular, criada e personalizada{' '}
                <Text style={styles.headlineGold}>página por página.</Text>
              </Text>

              <View style={styles.art}>
                <Animated.View style={[styles.artCard, floatCard]}>
                  <View style={styles.artCover}>
                    <Ionicons name="book" size={22} color={colors.onDark} />
                  </View>
                  <View style={styles.artInfo}>
                    <View style={styles.artLineTitle} />
                    <View style={styles.artLineSub} />
                    <View style={styles.artTrack}>
                      <View style={styles.artFill} />
                    </View>
                  </View>
                </Animated.View>
                <Animated.View style={[styles.artPill, floatPill]}>
                  <View style={styles.artCheck}>
                    <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                  </View>
                  <View style={styles.artPillLine} />
                </Animated.View>
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        <Animated.View style={[styles.sheet, cardAnim]}>
          <Text style={styles.formTitle}>Bem-vindo</Text>
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

          <Touchable
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
          </Touchable>

          <Text style={styles.copyrightText}>Entre Páginas © {new Date().getFullYear()}</Text>
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroSafe: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroContent: {
    paddingTop: 20,
  },
  blobA: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -90,
    right: -80,
    backgroundColor: colors.heroGlowWarm,
  },
  blobB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -70,
    left: -60,
    backgroundColor: colors.heroGlowCool,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.heroText,
  },
  headline: {
    fontFamily: fonts.heading,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1,
    color: colors.heroText,
    marginTop: 28,
  },
  headlineGold: {
    color: colors.heroAccent,
  },
  art: {
    marginTop: 28,
    height: 110,
    justifyContent: 'center',
  },
  artCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    width: '86%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  artCover: {
    width: 44,
    height: 60,
    borderRadius: 6,
    backgroundColor: colors.covers.madeira,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artInfo: {
    flex: 1,
    gap: 8,
  },
  artLineTitle: {
    height: 9,
    width: '70%',
    borderRadius: 5,
    backgroundColor: colors.text,
    opacity: 0.85,
  },
  artLineSub: {
    height: 7,
    width: '45%',
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  artTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  artFill: {
    width: '64%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  artPill: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  artCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artPillLine: {
    height: 7,
    width: 44,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  sheet: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },
  formTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    letterSpacing: -0.5,
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
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  copyrightText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 28,
  },
});
