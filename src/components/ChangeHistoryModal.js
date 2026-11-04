import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { diffSnippet } from '../services/marks';
import { colors } from '../theme/colors';

const TYPE_INFO = {
  edit: { label: 'Trecho alterado', icon: 'create-outline', color: colors.accentGold },
  add: { label: 'Capítulo adicionado', icon: 'add-circle-outline', color: colors.success },
  move: { label: 'Capítulo reordenado', icon: 'swap-vertical-outline', color: colors.secondary },
  delete: { label: 'Capítulo removido', icon: 'remove-circle-outline', color: colors.danger },
};

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function preview(text = '', size = 160) {
  return text.length > size ? `${text.slice(0, size).trim()}…` : text;
}

function ChangeEntry({ entry }) {
  const info = TYPE_INFO[entry.type] || TYPE_INFO.edit;
  const titleChanged = entry.type === 'edit' && entry.before.title !== entry.after.title;
  const contentChanged = entry.type === 'edit' && entry.before.content !== entry.after.content;
  const diff = contentChanged ? diffSnippet(entry.before.content, entry.after.content) : null;

  return (
    <View style={styles.entry}>
      <View style={styles.entryHeader}>
        <Ionicons name={info.icon} size={18} color={info.color} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.entryType}>{info.label}</Text>
          <Text style={styles.entryChapter} numberOfLines={1}>{entry.chapterTitle}</Text>
        </View>
        <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
      </View>

      {titleChanged && (
        <View style={styles.compareBlock}>
          <Text style={styles.compareLabel}>TÍTULO</Text>
          <Text style={styles.removedText}>{entry.before.title}</Text>
          <Text style={styles.addedText}>{entry.after.title}</Text>
        </View>
      )}

      {diff && (
        <View style={styles.compareBlock}>
          <View style={[styles.versionBox, styles.beforeBox]}>
            <Text style={[styles.compareLabel, { color: colors.danger }]}>ANTES</Text>
            <Text style={styles.versionText}>
              {diff.lead}
              <Text style={styles.removedText}>{diff.removed || ' '}</Text>
              {diff.trail}
            </Text>
          </View>
          <View style={[styles.versionBox, styles.afterBox]}>
            <Text style={[styles.compareLabel, { color: colors.success }]}>DEPOIS</Text>
            <Text style={styles.versionText}>
              {diff.lead}
              <Text style={styles.addedText}>{diff.added || ' '}</Text>
              {diff.trail}
            </Text>
          </View>
        </View>
      )}

      {entry.type === 'move' && (
        <View style={styles.compareBlock}>
          <View style={[styles.versionBox, styles.beforeBox]}>
            <Text style={[styles.compareLabel, { color: colors.danger }]}>ANTES</Text>
            <Text style={styles.versionText}>{entry.before.title}</Text>
          </View>
          <View style={[styles.versionBox, styles.afterBox]}>
            <Text style={[styles.compareLabel, { color: colors.success }]}>DEPOIS</Text>
            <Text style={styles.versionText}>{entry.after.title}</Text>
          </View>
        </View>
      )}

      {entry.type === 'add' && (
        <View style={[styles.versionBox, styles.afterBox]}>
          <Text style={[styles.compareLabel, { color: colors.success }]}>DEPOIS</Text>
          <Text style={styles.versionText}>{preview(entry.after.content)}</Text>
        </View>
      )}

      {entry.type === 'delete' && (
        <View style={[styles.versionBox, styles.beforeBox]}>
          <Text style={[styles.compareLabel, { color: colors.danger }]}>ANTES</Text>
          <Text style={styles.versionText}>{preview(entry.before.content)}</Text>
        </View>
      )}
    </View>
  );
}

export default function ChangeHistoryModal({ visible, book, onClose }) {
  const changes = book?.changeLog || [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.topBarTitle}>Histórico de Alterações</Text>
            <Text style={styles.topBarSubtitle} numberOfLines={1}>{book?.title}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Esta obra não é de sua autoria. Toda alteração no texto fica registrada aqui, com a versão anterior e a nova.
            </Text>
          </View>

          {changes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhuma alteração feita nesta obra até agora.</Text>
            </View>
          ) : (
            changes.map(entry => <ChangeEntry key={entry.id} entry={entry} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'serif',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
    lineHeight: 17,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  entry: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryType: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  entryChapter: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'serif',
    marginTop: 1,
  },
  entryDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 8,
  },
  compareBlock: {
    gap: 8,
    marginBottom: 4,
  },
  compareLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 4,
  },
  versionBox: {
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  beforeBox: {
    backgroundColor: colors.dangerLight,
    borderLeftColor: colors.danger,
  },
  afterBox: {
    backgroundColor: colors.successLight,
    borderLeftColor: colors.success,
  },
  versionText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    fontFamily: 'serif',
  },
  removedText: {
    backgroundColor: '#F8C9C4',
    textDecorationLine: 'line-through',
    color: colors.danger,
  },
  addedText: {
    backgroundColor: '#BFE5C1',
    color: colors.success,
    fontWeight: '700',
  },
});
