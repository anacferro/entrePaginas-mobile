import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { storage } from '../services/storage';
import { authService } from '../services/auth';
import { dialog } from '../services/dialog';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

const THEME_OPTIONS = [
  { value: 'system', label: 'Automático', icon: 'phone-portrait-outline', hint: 'Segue o tema do aparelho' },
  { value: 'light', label: 'Claro', icon: 'sunny-outline', hint: 'Fundo claro, ótimo de dia' },
  { value: 'dark', label: 'Escuro', icon: 'moon-outline', hint: 'Fundo escuro, confortável à noite' },
];

export default function SettingsScreen({ navigation }) {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || '';

  const handleSignOut = () => {
    dialog.alert(
      'Sair da conta',
      'Deseja encerrar a sessão neste aparelho? Seus livros continuam salvos na sua conta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: () => authService.signOut() },
      ]
    );
  };

  const handleDeleteData = () => {
    dialog.alert(
      'Apagar todos os dados',
      'Todos os livros da estante e do baú, com capítulos, marcadores e grifos, serão apagados deste aparelho e da nuvem. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const done = await storage.deleteAllData();
              if (done) {
                dialog.alert('Dados apagados', 'Sua estante e seu baú estão vazios.');
              } else {
                dialog.alert(
                  'Não foi possível apagar',
                  'A nuvem não respondeu e nada foi apagado. Verifique a conexão e tente de novo.'
                );
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Configurações</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="color-palette-outline" size={18} color={colors.secondary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Aparência</Text>
          </View>
          <Text style={styles.cardDesc}>Escolha como o aplicativo aparece. A escolha fica salva neste aparelho.</Text>

          {THEME_OPTIONS.map((option) => {
            const active = mode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setMode(option.value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Tema ${option.label}`}
              >
                <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                  <Ionicons name={option.icon} size={18} color={active ? colors.onPrimary : colors.textSecondary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={active ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Conta</Text>
          </View>

          <View style={styles.accountRow}>
            <Avatar size={46} />
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{displayName}</Text>
              <Text style={styles.accountEmail}>{user?.email}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
            accessibilityLabel="Sair da conta"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.text} style={styles.btnIcon} />
            <Text style={styles.secondaryBtnText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Dados</Text>
          </View>
          <Text style={styles.cardDesc}>
            Apaga todos os livros, capítulos, marcadores e grifos deste aparelho e da nuvem. Sua conta continua ativa.
          </Text>

          <TouchableOpacity
            style={[styles.dangerBtn, deleting && styles.btnDisabled]}
            onPress={handleDeleteData}
            disabled={deleting}
            activeOpacity={0.8}
            accessibilityLabel="Apagar todos os dados"
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.danger} style={styles.btnIcon} />
            )}
            <Text style={styles.dangerBtnText}>{deleting ? 'Apagando...' : 'Apagar todos os dados'}</Text>
          </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    marginRight: 12,
  },
  optionIconActive: {
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  accountInfo: {
    marginLeft: 12,
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  accountEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerLight,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnIcon: {
    marginRight: 8,
  },
});
