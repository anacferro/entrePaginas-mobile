import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import Touchable from './Touchable';
import CharacterMap from './CharacterMap';

export default function CharacterMapModal({ visible, onClose, bookId, chapters, pages, currentIndex, onGoToPage }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const goTo = (pageIndex) => {
    onGoToPage(pageIndex);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="people-outline" size={18} color={colors.secondary} />
              <Text style={styles.title}>Mapa de personagens</Text>
            </View>
            <Touchable style={styles.close} onPress={onClose} accessibilityLabel="Fechar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Touchable>
          </View>
          <CharacterMap
            bookId={bookId}
            chapters={chapters}
            pages={pages}
            limitIndex={currentIndex}
            onGoToPage={goTo}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    height: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.lg,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: fonts.heading,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
});
