import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const handleGoogleLogin = () => {
    // In this milestone: mock auth session without remote Firebase, navigating directly to MainTabs
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        {/* Top Brand Identity */}
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

        {/* Central Action */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={handleGoogleLogin}
          >
            <View style={styles.googleIconContainer}>
              <Ionicons name="logo-google" size={20} color="#EA4335" />
            </View>
            <Text style={styles.googleButtonText}>Continuar com Google</Text>
          </TouchableOpacity>

          {/* Feature Highlights */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Crie livros do zero</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Importe diversos formatos</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="cloud-done-outline" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Tudo salvo na nuvem</Text>
            </View>
          </View>
        </View>

        {/* Bottom Legal Notice */}
        <View style={styles.footerSection}>
          <Text style={styles.legalLinks}>
            Termos de Uso  •  Política de Privacidade
          </Text>
          <Text style={styles.copyrightText}>
            Entre Páginas © 2025 • Edição de Colecionador
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: 40,
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
    marginBottom: 26,
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
    marginBottom: 14,
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
  actionSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 32,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  featuresList: {
    alignItems: 'flex-start',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 12,
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
