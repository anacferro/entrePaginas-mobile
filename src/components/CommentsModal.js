import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';
import { fieldStyles, METRICS } from './FormBlocks';

export default function CommentsModal({ visible, book, pageNumber, onAdd, onRemove, onClose }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const field = useThemedStyles(fieldStyles);
  const [text, setText] = useState('');
  const comments = [...(book?.comments || [])].sort((a, b) => a.page - b.page);

  const submit = async () => {
    if (!text.trim()) return;
    await onAdd(text.trim());
    setText('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider><SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Touchable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Fechar comentários">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Touchable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>Meus comentários</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{book?.title}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              Esta obra não é sua, então o texto fica intacto. O que você escrever aqui vira um comentário seu, ligado à página.
            </Text>
          </View>

          {comments.length === 0 ? (
            <Text style={styles.empty}>Nenhum comentário ainda.</Text>
          ) : (
            comments.map(c => (
              <View key={c.id} style={styles.comment}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentPage}>Página {c.page}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
                <Touchable onPress={() => onRemove(c.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Excluir comentário">
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Touchable>
              </View>
            ))
          )}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.composer}>
            <Text style={styles.composerLabel}>Novo comentário na página {pageNumber}</Text>
            <TextInput
              style={[field.input, field.textarea]}
              placeholder="Escreva sua anotação"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Touchable style={[styles.send, !text.trim() && { opacity: 0.5 }]} onPress={submit} disabled={!text.trim()}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.sendText}>Adicionar comentário</Text>
            </Touchable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  content: { padding: 16, gap: 10 },
  notice: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: METRICS.radius,
    backgroundColor: colors.primaryLight,
  },
  noticeText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  empty: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 24 },
  comment: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: METRICS.radius,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentPage: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  commentText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  composer: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  send: {
    height: METRICS.buttonHeight,
    borderRadius: METRICS.radius,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
});
