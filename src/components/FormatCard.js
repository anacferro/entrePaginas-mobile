import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Touchable from './Touchable';
import { useThemedStyles } from '../theme/ThemeContext';

export default function FormatCard({ format, icon, name, description, tone, loading, fileName, onPick, onDropFile }) {
  const styles = useThemedStyles(createStyles);
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (Platform.OS !== 'web' || !node?.addEventListener) return undefined;

    const over = (event) => {
      event.preventDefault();
      setDragging(true);
    };
    const leave = () => setDragging(false);
    const drop = (event) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) onDropFile(format, file);
    };

    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
  }, [format, onDropFile]);

  return (
    <View ref={ref} style={styles.cell}>
      <Touchable
        style={[styles.card, (dragging || fileName) && styles.cardActive]}
        onPress={() => onPick(format)}
        disabled={loading}
        accessibilityLabel={`Importar arquivo ${name}`}
      >
        <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
          {loading ? (
            <ActivityIndicator size="small" color={tone.fg} />
          ) : (
            <Ionicons name={icon} size={20} color={tone.fg} />
          )}
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={[styles.hint, fileName && styles.hintDone]} numberOfLines={2}>
          {loading
            ? 'Lendo o arquivo...'
            : fileName
              ? fileName
              : dragging
                ? 'Solte o arquivo aqui'
                : Platform.OS === 'web'
                  ? 'Toque ou arraste o arquivo'
                  : 'Toque para escolher o arquivo'}
        </Text>
      </Touchable>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  cell: {
    width: '48%',
  },
  card: {
    minHeight: 150,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  cardActive: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
  },
  hintDone: {
    color: colors.primary,
  },
});
