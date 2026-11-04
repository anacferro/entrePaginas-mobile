import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BookCover from './BookCover';
import AiSuggest from './AiSuggest';
import { COVER_COLORS, TITLE_COLORS, PAPER_COLORS, CATEGORIES } from '../theme/bookOptions';
import { colors } from '../theme/colors';

function ColorRow({ label, options, value, onChange, outlined }) {
  return (
    <View style={styles.group}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.swatchesRow}>
        {options.map((item) => (
          <TouchableOpacity
            key={item.color}
            style={styles.swatchItem}
            onPress={() => onChange(item.color)}
            activeOpacity={0.7}
            accessibilityLabel={`${label} ${item.label}`}
          >
            <View
              style={[
                styles.colorCircle,
                { backgroundColor: item.color },
                outlined && { borderWidth: 1, borderColor: colors.border },
                value === item.color && styles.colorCircleSelected,
              ]}
            />
            <Text style={styles.colorName}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function BookEditModal({ visible, book, onCancel, onSave }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Literatura');
  const [coverColor, setCoverColor] = useState('#215C50');
  const [titleColor, setTitleColor] = useState('#FFFFFF');
  const [paperColor, setPaperColor] = useState('#F4EAE0');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && book) {
      setTitle(book.title);
      setSubtitle(book.subtitle || '');
      setCategory(book.category || 'Literatura');
      setCoverColor(book.coverColor);
      setTitleColor(book.titleColor);
      setPaperColor(book.paperColor || '#F4EAE0');
      setTags(book.tags || []);
      setSaving(false);
    }
  }, [visible, book]);

  const canSave = title.trim().length > 0 && !saving;
  const categories = CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES];

  const handleApplySuggestion = (suggestion) => {
    if (suggestion.category) setCategory(suggestion.category);
    if (suggestion.tags) setTags(suggestion.tags);
    if (suggestion.synopsis && !subtitle.trim()) setSubtitle(suggestion.synopsis);
  };

  const bookText = (book?.chapters || []).map(c => c.content).join('\n\n');

  const handleSave = async () => {
    setSaving(true);
    await onSave({ title, subtitle, category, coverColor, titleColor, paperColor, tags });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <Text style={styles.topBarTitle}>Editar Livro</Text>

            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.previewBox}>
              <BookCover
                title={title.trim() || 'Novo Livro'}
                coverColor={coverColor}
                titleColor={titleColor}
                totalPages={book?.totalPages}
                size="small"
              />
            </View>

            <Text style={styles.fieldLabel}>Título da Obra *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do livro..."
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Título da obra"
            />

            <Text style={styles.fieldLabel}>Subtítulo ou Resumo Curto</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Breve descrição ou notas editoriais..."
              placeholderTextColor={colors.textMuted}
              value={subtitle}
              onChangeText={setSubtitle}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Subtítulo"
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagChip}
                    onPress={() => setTags(tags.filter(t => t !== tag))}
                    accessibilityLabel={`Remover etiqueta ${tag}`}
                  >
                    <Text style={styles.tagText}>{tag} ×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <AiSuggest title={title} text={bookText} onApply={handleApplySuggestion} />

            <ColorRow label="Cor da Capa" options={COVER_COLORS} value={coverColor} onChange={setCoverColor} />
            <ColorRow label="Cor do Título" options={TITLE_COLORS} value={titleColor} onChange={setTitleColor} outlined />
            <ColorRow label="Cor da Folha" options={PAPER_COLORS} value={paperColor} onChange={setPaperColor} outlined />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'serif',
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
    color: '#FFFFFF',
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
  },
  previewBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  group: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  multiline: {
    height: 80,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
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
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatchItem: {
    alignItems: 'center',
    marginRight: 14,
    marginBottom: 6,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  colorName: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
