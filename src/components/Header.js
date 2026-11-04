import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';

export default function Header({ subtitle = 'Estante', onProfilePress, onLogoPress }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Touchable 
        style={styles.brandRow} 
        activeOpacity={0.7}
        onPress={onLogoPress}
      >
        <View style={styles.logoBadge}>
          <Ionicons name="book" size={18} color={colors.primary} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.brandTitle}>Entre Páginas</Text>
          <Text style={styles.brandSubtitle}>{subtitle}</Text>
        </View>
      </Touchable>

      <View style={styles.rightRow}>
        <Touchable
          style={styles.iconButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Abrir configurações"
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
        </Touchable>

        <Touchable 
          style={styles.avatarButton} 
          activeOpacity={0.8}
          onPress={onProfilePress}
        >
          <Avatar size={35} />
        </Touchable>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  titleColumn: {
    marginLeft: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: -1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
