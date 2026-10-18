import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function LoadingView({ message = 'Folheando os tomos da estante...' }) {
  return (
    <View style={styles.container}>
      <View style={styles.loaderCircle}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'serif',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
