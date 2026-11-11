import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Section, Field, CoverPicker, CategoryPicker, ColorRow, FontPicker, fieldStyles } from './FormBlocks';
import { COVER_COLORS, TITLE_COLORS, PAPER_COLORS, DEFAULT_COVER_COLOR, DEFAULT_TITLE_COLOR, DEFAULT_PAPER_COLOR } from '../theme/bookOptions';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';
import { fonts } from '../theme/tokens';

export default function BookEditModal({ visible, book, onCancel, onSave }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Literatura');
  const [coverColor, setCoverColor] = useState(DEFAULT_COVER_COLOR);
  const [titleColor, setTitleColor] = useState(DEFAULT_TITLE_COLOR);
  const [paperColor, setPaperColor] = useState(DEFAULT_PAPER_COLOR);
  const [fontFamily, setFontFamily] = useState('serif');
  const [tags, setTags] = useState([]);
  const [coverImage, setCoverImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && book) {
      setTitle(book.title);
      setSubtitle(book.subtitle || '');
      setCategory(book.category || 'Literatura');
      setCoverColor(book.coverColor);
      setTitleColor(book.titleColor);
      setPaperColor(book.paperColor || DEFAULT_PAPER_COLOR);
      setFontFamily(book.fontFamily || 'serif');
      setTags(book.tags || []);
      setCoverImage(book.coverImage || null);
      setSaving(false);
    }
  }, [visible, book]);

  const canSave = title.trim().length > 0 && !saving;


  const handleSave = async () => {
    setSaving(true);
    await onSave({ title, subtitle, category, coverColor, titleColor, paperColor, fontFamily, tags, coverImage });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaProvider><SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topBar}>
            <Touchable onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Touchable>

            <Text style={styles.topBarTitle}>Editar Livro</Text>

            <Touchable
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
            </Touchable>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Section icon="image-outline" title="Capa" hint="Use uma foto sua ou escolha as cores da capa.">
              <CoverPicker
                title={title}
                coverColor={coverColor}
                titleColor={titleColor}
                coverImage={coverImage}
                onChange={setCoverImage}
              />
              {!coverImage && (
                <>
                  <ColorRow label="Cor da capa" options={COVER_COLORS} value={coverColor} onChange={setCoverColor} />
                  <ColorRow label="Cor do título" options={TITLE_COLORS} value={titleColor} onChange={setTitleColor} outlined />
                </>
              )}
            </Section>

            <Section icon="create-outline" title="Informações">
              <Field label="Título da obra *">
                <TextInput
                  style={styles.input}
                  placeholder="Nome do livro"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="next"
                  accessibilityLabel="Título da obra"
                />
              </Field>

              <Field label="Subtítulo ou resumo curto">
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Breve descrição ou notas"
                  placeholderTextColor={colors.textMuted}
                  value={subtitle}
                  onChangeText={setSubtitle}
                  multiline
                  blurOnSubmit
                  accessibilityLabel="Subtítulo"
                />
              </Field>

              <Field label="Categoria">
                <CategoryPicker value={category} onChange={setCategory} />
              </Field>

              {tags.length > 0 && (
                <Field label="Etiquetas">
                  <View style={styles.tagsRow}>
                    {tags.map((tag) => (
                      <Touchable
                        key={tag}
                        style={styles.tagChip}
                        onPress={() => setTags(tags.filter(t => t !== tag))}
                        accessibilityLabel={`Remover etiqueta ${tag}`}
                      >
                        <Text style={styles.tagText}>{tag} ×</Text>
                      </Touchable>
                    ))}
                  </View>
                </Field>
              )}
            </Section>

            <Section icon="document-text-outline" title="Folha de leitura" hint="Cor e letra usadas nas páginas ao ler.">
              <ColorRow label="Cor da folha" options={PAPER_COLORS} value={paperColor} onChange={setPaperColor} outlined />
              <Field label="Tipo de letra">
                <FontPicker value={fontFamily} onChange={setFontFamily} original={book?.customFont ? book.fontLabel : null} />
              </Field>
            </Section>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surfaceWarm,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.heading,
    color: colors.text,
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
  body: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
  },
  input: fieldStyles(colors).input,
  textarea: fieldStyles(colors).textarea,
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
