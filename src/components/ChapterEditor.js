import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { camera } from '../services/camera';
import { ai } from '../services/ai';
import { dialog } from '../services/dialog';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function ChapterEditor({
  visible,
  chapter,
  chapterNumber,
  notice,
  onCancel,
  onSave,
  onDelete,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(chapter?.title || '');
      setContent(chapter?.content || '');
      setPhoto(chapter?.photo || null);
      setSaving(false);
    }
  }, [visible, chapter]);

  const theme = colors.reader;
  const mutedColor = colors.textSecondary;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const canSave = (content.trim().length > 0 || !!photo) && !saving;

  const handleTakePhoto = async () => {
    const uri = await camera.capturePage();
    if (uri) setPhoto(uri);
  };

  const handleTranscribe = async () => {
    setTranscribing(true);
    try {
      const text = await ai.transcribePhoto(photo);
      if (text.trim() === 'SEM_TEXTO') {
        dialog.alert('Sem texto', 'Não encontrei texto legível nessa foto. Tente fotografar de novo com mais luz e a página inteira.');
      } else {
        setContent(prev => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
      }
    } catch (e) {
      dialog.alert('Falha na transcrição', e.message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({ title, content, photo });
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
          <View style={[styles.topBar, { backgroundColor: colors.surfaceWarm }]}>
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
              style={[styles.titleInput, { color: theme.text, borderBottomColor: colors.border }]}
              placeholder={`Capítulo ${chapterNumber}`}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            {photo && (
              <View style={styles.photoRow}>
                <Image source={{ uri: photo }} style={styles.photoThumb} />
                <Text style={[styles.photoLabel, { color: mutedColor }]}>Página fotografada</Text>
                {ai.isAvailable && (
                  <TouchableOpacity
                    style={styles.transcribeBtn}
                    onPress={handleTranscribe}
                    disabled={transcribing}
                    accessibilityLabel="Transcrever texto da foto"
                  >
                    {transcribing ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                    )}
                    <Text style={styles.transcribeText}>{transcribing ? 'Lendo...' : 'Transcrever'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Remover foto"
                >
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}

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

          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.wordCount, { color: mutedColor }]}>
              {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
            </Text>

            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={handleTakePhoto}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fotografar página"
            >
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.cameraText}>Fotografar</Text>
            </TouchableOpacity>

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

const createStyles = (colors) => StyleSheet.create({
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
    color: colors.onPrimary,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.warningText,
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
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  photoThumb: {
    width: 44,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  photoLabel: {
    flex: 1,
    fontSize: 13,
  },
  transcribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    marginRight: 10,
  },
  transcribeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cameraText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
