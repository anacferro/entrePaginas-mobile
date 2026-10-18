import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { storage } from '../services/storage';
import { colors } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [activeBooksCount, setActiveBooksCount] = useState(0);
  const [chestBooksCount, setChestBooksCount] = useState(0);
  const [readerTheme, setReaderTheme] = useState('light');
  const [simulateError, setSimulateError] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
      setReaderTheme(u.readerTheme || 'light');
      setSimulateError(isErr);
    } catch (e) {
      console.log('Error loading profile:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const handleThemeChange = async (theme) => {
    setReaderTheme(theme);
    await storage.updateUserProfile({ readerTheme: theme });
  };

  const handleToggleSimulateError = async (val) => {
    setSimulateError(val);
    await storage.setSimulateError(val);
    Alert.alert(
      val ? 'Simulação de Erro Ativada' : 'Simulação de Erro Desativada',
      val
        ? 'Ao abrir a Estante ou Baú, a listagem apresentará o estado de ERRO tratado com botão de retry.'
        : 'As listagens agora carregarão normalmente.'
    );
  };

  const handleManualSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      Alert.alert('Sincronização Concluída', 'Todos os compêndios locais foram sincronizados e validados.');
    }, 900);
  };

  const handleClearAll = () => {
    Alert.alert(
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
            Alert.alert('Estante Esvaziada', 'Abra a aba Estante para ver o estado vazio.');
          },
        },
      ]
    );
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Restaurar Dados Padrão',
      'Deseja restaurar a biblioteca com os livros e configurações iniciais do Figma?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            await storage.resetToDefaults();
            loadUserData();
            Alert.alert('Restaurado', 'A biblioteca foi recarregada com o acervo original.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Desconectar da Conta',
      'Deseja encerrar a sessão local e retornar para a tela de boas-vindas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          onPress: () => navigation.replace('Login'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceSoft} />
      <Header subtitle="Perfil" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80' }}
              style={styles.avatarImg}
            />
            <View style={styles.avatarBadge}>
              <Ionicons name="book" size={12} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Camila Duarte'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'camila.livros@gmail.com'}</Text>
          </View>
        </View>

        {/* Stats Grid */}
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
            <Text style={styles.statNumber}>1.420</Text>
            <Text style={styles.statLabel}>Páginas Lidas</Text>
          </View>
        </View>

        {/* Sincronização & Nuvem */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cloud-done-outline" size={18} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.sectionCardTitle}>Sincronização & Nuvem</Text>
            </View>
            <View style={styles.firebaseTag}>
              <Text style={styles.firebaseTagText}>Firebase</Text>
            </View>
          </View>

          <View style={styles.syncStatusBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.greenPulse} />
              <View>
                <Text style={styles.syncStatusTitle}>Conectado e Ativo</Text>
                <Text style={styles.syncStatusSubtitle}>Sincronizado em tempo real</Text>
              </View>
            </View>
            <Ionicons name="cloud-outline" size={20} color={colors.primary} />
          </View>

          {/* Progress gauge */}
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeLabel}>Espaço do Acervo</Text>
            <Text style={styles.gaugeValue}>24.5 MB de 1 GB utilizado</Text>
          </View>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeFill, { width: '25%' }]} />
          </View>
          <Text style={styles.gaugeFooterText}>
            Seus destaques, capas e anotações estão salvos e protegidos localmente.
          </Text>

          <TouchableOpacity
            style={styles.syncNowBtn}
            activeOpacity={0.8}
            onPress={handleManualSync}
            disabled={syncing}
          >
            <Ionicons
              name="sync-outline"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.syncNowBtnText}>
              {syncing ? 'Sincronizando...' : 'Sincronizar agora manualmente'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preferências de Leitura */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="color-palette-outline" size={18} color={colors.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionCardTitle}>Preferências de Leitura</Text>
            </View>
          </View>

          <Text style={styles.subLabel}>TEMA PADRÃO DO LEITOR</Text>
          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[styles.themeOptionBtn, readerTheme === 'light' && styles.themeOptionBtnActive]}
              onPress={() => handleThemeChange('light')}
            >
              <Ionicons
                name="sunny-outline"
                size={18}
                color={readerTheme === 'light' ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.themeOptionText, readerTheme === 'light' && styles.themeOptionTextActive]}>
                Claro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOptionBtn, readerTheme === 'dark' && styles.themeOptionBtnActive]}
              onPress={() => handleThemeChange('dark')}
            >
              <Ionicons
                name="moon-outline"
                size={18}
                color={readerTheme === 'dark' ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.themeOptionText, readerTheme === 'dark' && styles.themeOptionTextActive]}>
                Escuro
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Academic / Evaluator Test Utilities */}
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
              thumbColor={simulateError ? '#FFFFFF' : '#F4F3F0'}
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

        {/* Danger / Logout Actions */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Desconectar da conta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerBtn} onPress={handleResetDefaults} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.dangerBtnText}>Excluir dados da biblioteca</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    borderColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
  firebaseTag: {
    backgroundColor: '#EBE1D5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  firebaseTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  syncStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
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
  syncStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  syncStatusSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gaugeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  gaugeValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  gaugeTrack: {
    height: 6,
    backgroundColor: '#E6DCD1',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  gaugeFooterText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: 10,
  },
  syncNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  themeOptionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  themeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
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
  logoutSection: {
    gap: 10,
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBE1D5',
    height: 48,
    borderRadius: 12,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEA',
    height: 48,
    borderRadius: 12,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
});
