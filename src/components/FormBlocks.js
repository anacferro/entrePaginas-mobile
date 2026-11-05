import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Touchable from './Touchable';
import BookCover from './BookCover';
import { camera } from '../services/camera';
import { categories as categoryStore } from '../services/categories';
import { dialog } from '../services/dialog';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { BOOK_FONTS, fontFamilyFor } from '../theme/bookOptions';

export const METRICS = {
  inputHeight: 48,
  textareaHeight: 104,
  buttonHeight: 48,
  radius: 12,
};

export const fieldStyles = (colors) => ({
  input: {
    height: METRICS.inputHeight,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: METRICS.radius,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  textarea: {
    height: METRICS.textareaHeight,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
});

export function Section({ icon, title, hint, children }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <Ionicons name={icon} size={18} color={colors.primary} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function Field({ label, children }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Button({ label, icon, onPress, variant = 'secondary', disabled, accessibilityLabel }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surfaceMuted, fg: colors.text, border: colors.border },
    danger: { bg: colors.dangerLight, fg: colors.danger, border: colors.dangerBorder },
  }[variant];

  return (
    <Touchable
      style={[
        styles.button,
        { backgroundColor: tone.bg, borderColor: tone.border },
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel || label}
    >
      {icon && <Ionicons name={icon} size={18} color={tone.fg} />}
      <Text style={[styles.buttonText, { color: tone.fg }]}>{label}</Text>
    </Touchable>
  );
}

export function ColorRow({ label, options, value, onChange, outlined }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.swatchesRow}>
        {options.map((item) => (
          <Touchable
            key={item.color}
            style={styles.swatchItem}
            onPress={() => onChange(item.color)}
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
          </Touchable>
        ))}
      </View>
    </View>
  );
}

export function FontPicker({ value, onChange, original }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.categoryRow}>
      {original && (
        <Touchable
          style={[styles.categoryChip, value === 'original' && styles.categoryChipActive]}
          onPress={() => onChange('original')}
          accessibilityLabel={`Letra original ${original}`}
        >
          <View style={styles.categoryLabelBtn}>
            <Text style={[styles.categoryText, value === 'original' && styles.categoryTextActive]}>
              Original do livro ({original})
            </Text>
          </View>
        </Touchable>
      )}
      {BOOK_FONTS.map((font) => {
        const active = (value || 'serif') === font.id;
        return (
          <Touchable
            key={font.id}
            style={[styles.categoryChip, active && styles.categoryChipActive]}
            onPress={() => onChange(font.id)}
            accessibilityLabel={`Letra ${font.label}`}
          >
            <View style={styles.categoryLabelBtn}>
              <Text style={[styles.categoryText, active && styles.categoryTextActive, { fontFamily: fontFamilyFor(font.id) }]}>
                {font.label}
              </Text>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}

export function CategoryPicker({ value, onChange }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    categoryStore.list().then(setList);
  }, []);

  const options = value && !list.includes(value) ? [value, ...list] : list;

  const handleAdd = async () => {
    const name = draft.trim();
    if (!name) return;
    setList(await categoryStore.add(name));
    onChange(name);
    setDraft('');
    setAdding(false);
  };

  const handleRemove = (name) => {
    dialog.alert('Excluir categoria', `Excluir a categoria "${name}"? Os livros que já usam esse nome não são alterados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => setList(await categoryStore.remove(name)),
      },
    ]);
  };

  return (
    <View style={styles.categoryWrap}>
      <View style={styles.categoryRow}>
        {options.map((name) => {
          const active = value === name;
          const removable = list.includes(name);
          return (
            <View key={name} style={[styles.categoryChip, active && styles.categoryChipActive]}>
              <Touchable
                style={styles.categoryLabelBtn}
                onPress={() => onChange(name)}
                accessibilityLabel={`Categoria ${name}`}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{name}</Text>
              </Touchable>
              {removable && (
                <Touchable
                  style={styles.categoryRemoveBtn}
                  onPress={() => handleRemove(name)}
                  accessibilityLabel={`Excluir categoria ${name}`}
                >
                  <Ionicons name="close" size={14} color={active ? colors.primary : colors.textMuted} />
                </Touchable>
              )}
            </View>
          );
        })}

        {!adding && (
          <Touchable
            style={[styles.categoryChip, styles.categoryAdd]}
            onPress={() => setAdding(true)}
            accessibilityLabel="Nova categoria"
          >
            <View style={styles.categoryLabelBtn}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.categoryText, { color: colors.primary }]}>Nova</Text>
            </View>
          </Touchable>
        )}
      </View>

      {adding && (
        <View style={styles.categoryNewRow}>
          <TextInput
            style={[fieldStyles(colors).input, styles.categoryInput]}
            placeholder="Nome da categoria"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleAdd}
            maxLength={30}
            autoFocus
            returnKeyType="done"
            accessibilityLabel="Nome da nova categoria"
          />
          <Button label="Adicionar" variant="primary" onPress={handleAdd} disabled={!draft.trim()} />
        </View>
      )}
    </View>
  );
}

export function CoverPicker({ title, coverColor, titleColor, coverImage, onChange }) {
  const styles = useThemedStyles(createStyles);

  const fromGallery = async () => {
    const uri = await camera.pickCover();
    if (uri) onChange(uri);
  };

  const fromCamera = async () => {
    const uri = await camera.captureCover();
    if (uri) onChange(uri);
  };

  return (
    <View style={styles.coverPicker}>
      <BookCover
        title={title.trim() || 'Novo Livro'}
        coverColor={coverColor}
        titleColor={titleColor}
        coverImage={coverImage}
        size="small"
      />
      <View style={styles.coverActions}>
        <Button label="Escolher da galeria" icon="images-outline" onPress={fromGallery} />
        <Button label="Tirar uma foto" icon="camera-outline" onPress={fromCamera} />
        {coverImage ? (
          <Button label="Remover foto" icon="trash-outline" variant="danger" onPress={() => onChange(null)} />
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.text,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionBody: {
    marginTop: 12,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  button: {
    minHeight: METRICS.buttonHeight,
    borderRadius: METRICS.radius,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchItem: {
    alignItems: 'center',
    width: 56,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  colorName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  categoryWrap: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryAdd: {
    borderStyle: 'dashed',
  },
  categoryLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  categoryRemoveBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryInput: {
    flex: 1,
  },
  coverPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  coverActions: {
    flex: 1,
    minWidth: 180,
    gap: 10,
  },
});
