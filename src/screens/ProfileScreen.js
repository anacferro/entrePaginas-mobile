import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { storage } from '../services/storage';
import Avatar from '../components/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [user, setUser] = useState(null);
  const [activeBooksCount, setActiveBooksCount] = useState(0);
  const [chestBooksCount, setChestBooksCount] = useState(0);
  const [libraryStats, setLibraryStats] = useState({ chapters: 0, bookmarks: 0, marks: 0, sizeKb: 0 });

  const loadUserData = async () => {
    try {
      const [u, books, chest] = await Promise.all([
        storage.getUserProfile(),
        storage.getBooks(0).catch(() => []),
        storage.getChestBooks(0).catch(() => []),
      ]);
      setUser(u);
      setActiveBooksCount(books.length);
      setChestBooksCount(chest.length);
      const allBooks = [...books, ...chest];
      setLibraryStats({
        chapters: allBooks.reduce((sum, b) => sum + (b.chapters?.length || 0), 0),
        bookmarks: allBooks.reduce((sum, b) => sum + (b.bookmarks?.length || 0), 0),
        marks: allBooks.reduce(
          (sum, b) => sum + (b.chapters || []).reduce((n, c) => n + (c.marks?.length || 0), 0),
          0
        ),
        sizeKb: Math.max(1, Math.round(JSON.stringify(allBooks).length / 1024)),
      });
    } catch {
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <Header subtitle="Perfil" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
            <Avatar size={60} style={styles.avatarImg} />
            <View style={styles.avatarBadge}>
              <Ionicons name="book" size={12} color={colors.onPrimary} />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconCircle}>
              <Ionicons name="book-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>{activeBooksCount}</Text>
            <Text style={styles.statLabel}>Livros na Estante</Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconCircle}>
              <Ionicons name="archive-outline" size={18} color={colors.secondary} />
            </View>
            <Text style={styles.statNumber}>{chestBooksCount}</Text>
            <Text style={styles.statLabel}>Livros no Baú</Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconCircle}>
              <Ionicons name="reader-outline" size={18} color={colors.accentGold} />
            </View>
            <Text style={styles.statNumber}>{libraryStats.chapters}</Text>
            <Text style={styles.statLabel}>Capítulos</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.sectionCardTitle}>Armazenamento</Text>
            </View>
            <View style={styles.storageTag}>
              <Text style={styles.storageTagText}>Local</Text>
            </View>
          </View>

          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Espaço do acervo</Text>
            <Text style={styles.storageValue}>{libraryStats.sizeKb.toLocaleString('pt-BR')} KB</Text>
          </View>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Páginas marcadas</Text>
            <Text style={styles.storageValue}>{libraryStats.bookmarks}</Text>
          </View>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Trechos grifados</Text>
            <Text style={styles.storageValue}>{libraryStats.marks}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWarm,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.accentPeach,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceWarm,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  storageTag: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  storageTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  storageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  storageValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
});
