import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { storage } from '../services/storage';
import { dialog } from '../services/dialog';
import Avatar from '../components/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [user, setUser] = useState(null);
  const [activeBooksCount, setActiveBooksCount] = useState(0);
  const [chestBooksCount, setChestBooksCount] = useState(0);
  const [simulateError, setSimulateError] = useState(false);
  const [libraryStats, setLibraryStats] = useState({ chapters: 0, bookmarks: 0, marks: 0, sizeKb: 0 });

  const loadUserData = async () => {
    try {
      const [u, books, chest, isErr] = await Promise.all([
        storage.getUserProfile(),
        storage.getBooks(0).catch(() => []),
        storage.getChestBooks(0).catch(() => []),
        storage.getSimulateError(),
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
      setSimulateError(isErr);
    } catch {
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const handleToggleSimulateError = async (val) => {
    setSimulateError(val);
    await storage.setSimulateError(val);
    dialog.alert(
      val ? 'Simulação de Erro Ativada' : 'Simulação de Erro Desativada',
      val
        ? 'Ao abrir a Estante ou Baú, a listagem apresentará o estado de ERRO tratado com botão de retry.'
        : 'As listagens agora carregarão normalmente.'
    );
  };

  const handleClearAll = () => {
    dialog.alert(
      'Testar Estado Vazio',
      'Deseja esvaziar a estante para visualizar o tratamento de estado vazio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Esvaziar',
          style: 'destructive',
          onPress: async () => {
            await storage.clearAllBooks();
            loadUserData();
            dialog.alert('Estante Esvaziada', 'Abra a aba Estante para ver o estado vazio.');
          },
        },
      ]
    );
  };

  const handleResetDefaults = () => {
    dialog.alert(
      'Restaurar Dados Padrão',
      'Deseja restaurar a biblioteca com os livros e configurações iniciais de exemplo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            await storage.resetToDefaults();
            loadUserData();
            dialog.alert('Restaurado', 'A biblioteca foi recarregada com o acervo original.');
          },
        },
      ]
    );
  };

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

          <View style={styles.storageStatusBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.greenPulse} />
              <View>
                <Text style={styles.storageStatusTitle}>Salvo no aparelho e na nuvem</Text>
                <Text style={styles.storageStatusSubtitle}>Funciona sem internet e sincroniza ao reconectar</Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
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
          <Text style={styles.storageFooterText}>
            Seus livros, destaques e anotações ficam salvos no aparelho e sincronizados com a sua conta.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
          accessibilityLabel="Abrir configurações"
        >
          <View style={styles.settingsIcon}>
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingsText}>
            <Text style={styles.settingsTitle}>Configurações</Text>
            <Text style={styles.settingsSub}>Tema, conta e dados</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={[styles.sectionCard, { borderColor: colors.borderLight }]}>
          <Text style={styles.academicTitle}>Ferramentas de Avaliação (Estados de Listagem)</Text>
          <Text style={styles.academicDesc}>
            Recursos para demonstrar os requisitos avaliativos de estados vazio e erro.
          </Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.switchLabel}>Simular Erro nas Listagens</Text>
              <Text style={styles.switchSub}>Dispara o tratamento de erro com retry</Text>
            </View>
            <Switch
              value={simulateError}
              onValueChange={handleToggleSimulateError}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={simulateError ? colors.onPrimary : colors.card}
            />
          </View>

          <View style={styles.testButtonsRow}>
            <TouchableOpacity style={styles.testBtn} onPress={handleClearAll}>
              <Text style={styles.testBtnText}>Testar Estado Vazio</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.testBtn, { backgroundColor: colors.surfaceSoft }]} onPress={handleResetDefaults}>
              <Text style={[styles.testBtnText, { color: colors.primary }]}>Restaurar Padrões</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    marginBottom: 16,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  settingsSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
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
    fontFamily: 'serif',
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
    fontFamily: 'serif',
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
    fontFamily: 'serif',
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
  storageStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
  },
  greenPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: 10,
  },
  storageStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  storageStatusSubtitle: {
    fontSize: 11,
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
  storageFooterText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 10,
  },
  academicTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  academicDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  switchSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  testButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testBtn: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
});
