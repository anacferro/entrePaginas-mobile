import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function ChapterEditor({
  visible,
  chapter,
  chapterNumber,
  isDark = false,
  notice,
  onCancel,
  onSave,
  onDelete,
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(chapter?.title || '');
      setContent(chapter?.content || '');
      setSaving(false);
    }
  }, [visible, chapter]);

  const theme = isDark ? colors.reader.dark : colors.reader.light;
  const mutedColor = isDark ? '#9A928A' : colors.textSecondary;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const canSave = content.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({ title, content });
    setSaving(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
        >
          <View style={[styles.topBar, { backgroundColor: isDark ? theme.card : colors.surfaceWarm }]}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.cancelText, { color: mutedColor }]}>Cancelar</Text>
            </TouchableOpacity>

            <Text style={[styles.topBarTitle, { color: theme.text }]}>
              {chapter ? 'Editar Capítulo' : 'Novo Capítulo'}
            </Text>

            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>

          {notice && (
            <View style={styles.notice}>
              <Ionicons name="git-compare-outline" size={15} color={colors.accentGold} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}

          <View style={styles.body}>
            <Text style={[styles.label, { color: mutedColor }]}>
              CAPÍTULO {chapterNumber < 10 ? `0${chapterNumber}` : chapterNumber}
            </Text>
            <TextInput
              style={[styles.titleInput, { color: theme.text, borderBottomColor: isDark ? '#3D3835' : colors.border }]}
              placeholder={`Capítulo ${chapterNumber}`}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            <TextInput
              style={[styles.contentInput, { color: theme.text }]}
              placeholder="Comece a escrever aqui..."
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              autoFocus={!chapter}
            />
          </View>

          <View style={[styles.footer, { borderTopColor: isDark ? '#3D3835' : colors.borderLight }]}>
            <Text style={[styles.wordCount, { color: mutedColor }]}>
              {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
            </Text>

            {chapter && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.deleteText}>Excluir capítulo</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FBF1DF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#8A6420',
  },
  body: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'serif',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  contentInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
    fontFamily: 'serif',
    paddingBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  wordCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
});
