import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';
import { fonts } from '../theme/tokens';

export default function ErrorView({
  title = 'Erro ao carregar o acervo',
  message = 'Ocorreu uma instabilidade ao ler os registros locais.',
  onRetry,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={38} color={colors.secondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <Touchable
          style={styles.retryButton}
          activeOpacity={0.8}
          onPress={onRetry}
        >
          <Ionicons name="refresh-outline" size={17} color={colors.onPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.retryText}>Tentar Novamente</Text>
        </Touchable>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    marginVertical: 18,
    marginHorizontal: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
    fontFamily: fonts.heading,
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 270,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});
