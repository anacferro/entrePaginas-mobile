import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { storage } from '../services/storage';
import Avatar from '../components/Avatar';
import ErrorView from '../components/ErrorView';
import Touchable from '../components/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, layout, radius, space, shadow } from '../theme/tokens';

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [user, setUser] = useState(null);
  const [libraryStats, setLibraryStats] = useState({ active: 0, chest: 0, chapters: 0, bookmarks: 0, marks: 0, sizeKb: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadUserData = async () => {
    try {
      setError(null);
      const [u, active, chest] = await Promise.all([
        storage.getUserProfile(),
        storage.getBooks(0),
        storage.getChestBooks(0),
      ]);
      setUser(u);
      const allBooks = [...active, ...chest];
      setLibraryStats({
        active: active.length,
        chest: chest.length,
        chapters: allBooks.reduce((sum, b) => sum + (b.chapters?.length || 0), 0),
        bookmarks: allBooks.reduce((sum, b) => sum + (b.bookmarks?.length || 0), 0),
        marks: allBooks.reduce(
          (sum, b) => sum + (b.chapters || []).reduce((n, c) => n + (c.marks?.length || 0), 0),
          0
        ),
        sizeKb: Math.max(1, Math.round(JSON.stringify(allBooks).length / 1024)),
      });
    } catch {
      setError('Não foi possível carregar seu perfil. Toque em tentar de novo ou puxe a tela para baixo.');
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <Header subtitle="Perfil" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
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

        <Touchable style={styles.literaryCard} onPress={() => navigation.navigate('PerfilLiterario')} accessibilityLabel="Abrir meu perfil literário">
          <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          <View style={styles.literaryText}>
            <Text style={styles.literaryTitle}>Meu perfil literário</Text>
            <Text style={styles.literaryHint}>Gostos, avaliações e privacidade</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>

        {error ? <ErrorView title="Falha ao carregar" message={error} onRetry={loadUserData} /> : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionCardTitleRow}>
              <Ionicons name="library-outline" size={18} color={colors.primary} style={styles.sectionCardIcon} />
              <Text style={styles.sectionCardTitle}>Acervo</Text>
            </View>
            <View style={styles.storageTag}>
              <Text style={styles.storageTagText}>Local</Text>
            </View>
          </View>

          {[
            ['Livros na estante', libraryStats.active],
            ['Livros no baú', libraryStats.chest],
            ['Capítulos', libraryStats.chapters],
            ['Páginas marcadas', libraryStats.bookmarks],
            ['Trechos grifados', libraryStats.marks],
            ['Espaço do acervo', `${libraryStats.sizeKb.toLocaleString('pt-BR')} KB`],
          ].map(([label, value]) => (
            <View key={label} style={styles.storageRow}>
              <Text style={styles.storageLabel}>{label}</Text>
              <Text style={styles.storageValue}>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</Text>
            </View>
          ))}
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
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: space.xl,
    ...shadow.card,
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
    borderColor: colors.secondary,
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
  literaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: space.xl,
  },
  literaryText: {
    flex: 1,
  },
  literaryTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  literaryHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 19,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: space.sm,
    marginBottom: space.lg,
    ...shadow.card,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  sectionCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCardIcon: {
    marginRight: space.sm,
  },
  sectionCardTitle: {
    fontSize: 17,
    color: colors.text,
    fontFamily: fonts.heading,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  storageLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  storageValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
