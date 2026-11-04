import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { cloud } from '../services/cloud';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

const syncInfo = (colors) => ({
  idle: { label: 'Salvo', color: colors.success },
  synced: { label: 'Sincronizado', color: colors.success },
  syncing: { label: 'Sincronizando', color: colors.accentGold },
  offline: { label: 'Offline', color: colors.textMuted },
  error: { label: 'Falha ao sincronizar', color: colors.danger },
});

export default function Header({ subtitle = 'Estante', onProfilePress, onLogoPress }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [syncStatus, setSyncStatus] = useState(cloud.getStatus());

  useEffect(() => cloud.subscribe(setSyncStatus), []);

  const infos = syncInfo(colors);
  const sync = infos[syncStatus] || infos.idle;

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
          <View style={[styles.syncDot, { backgroundColor: sync.color }]} />
          <Text style={styles.syncText}>{sync.label}</Text>
        </View>

        <TouchableOpacity 
          style={styles.avatarButton} 
          activeOpacity={0.8}
          onPress={onProfilePress}
        >
          <Avatar size={38} />
        </TouchableOpacity>
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
    backgroundColor: colors.card,
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
