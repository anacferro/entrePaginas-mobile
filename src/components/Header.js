import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function Header({ subtitle = 'Estante', onProfilePress, onLogoPress }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
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
      </TouchableOpacity>

      <View style={styles.rightRow}>
        <View style={styles.syncBadge}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Sincronizado</Text>
        </View>

        <TouchableOpacity 
          style={styles.avatarButton} 
          activeOpacity={0.8}
          onPress={onProfilePress}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=80' }}
            style={styles.avatarImage}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'serif',
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
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  syncText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.accentPeach,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
