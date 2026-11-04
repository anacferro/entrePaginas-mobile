import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BookCover, { useShelfCoverWidth } from './BookCover';
import ChangeHistoryModal from './ChangeHistoryModal';
import BookEditModal from './BookEditModal';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import Touchable from './Touchable';

export default function BookCard({
  book,
  onPress,
  onMoveToChest,
  onRestore,
  onEdit,
  onExport,
  onToggleLock,
  onDelete,
  progress = null,
  selecting = false,
  selected = false,
  onLongPress,
  onToggle,
  isChest = false,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [menuVisible, setMenuVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const coverWidth = useShelfCoverWidth();
  const isOwn = book.isOwn !== false;
  const changeCount = book.changeLog?.length || 0;
  const press = () => (selecting ? onToggle && onToggle(book.id) : onPress && onPress(book));
  const longPress = () => {
    if (onLongPress) onLongPress(book.id);
  };

  return (
    <View style={styles.cardContainer}>
      <Touchable
        activeOpacity={0.85}
        onPress={press}
        onLongPress={longPress}
        delayLongPress={350}
        style={styles.coverWrapper}
        accessibilityState={{ selected }}
      >
        <BookCover
          title={book.title}
          coverColor={book.coverColor}
          titleColor={book.titleColor}
          totalPages={book.totalPages}
          coverImage={book.coverImage}
          width={coverWidth}
          size="medium"
        />
        {progress && (
          <View style={[styles.progressBox, { width: coverWidth }]} pointerEvents="none">
            <Text style={styles.progressLabel} numberOfLines={1}>{progress.label}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress.value * 100)}%` }]} />
            </View>
          </View>
        )}
        {selecting && (
          <View
            pointerEvents="none"
            style={[styles.selectOverlay, selected && styles.selectOverlayOn, { width: coverWidth }]}
          >
            <View style={[styles.selectCheck, selected && styles.selectCheckOn]}>
              {selected && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
            </View>
          </View>
        )}
        {book.locked && (
          <View style={styles.lockBadge} accessibilityLabel="Livro protegido">
            <Ionicons name="lock-closed" size={13} color="#FFFFFF" />
          </View>
        )}
      </Touchable>

      <View style={[styles.infoRow, { width: coverWidth }]}>
        <Touchable
          style={styles.titleArea}
          onPress={press}
          onLongPress={longPress}
          delayLongPress={350}
          activeOpacity={0.7}
        >
          <Text style={styles.bookTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.bookMeta} numberOfLines={1}>
            {book.subtitle
              ? book.subtitle.length > 14
                ? `${book.subtitle.slice(0, 14).trim()}...`
                : book.subtitle
              : 'Volume'}{' '}
            • {book.totalPages}p
          </Text>
        </Touchable>

        {!selecting && (
          <Touchable
            style={styles.moreButton}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </Touchable>
        )}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {book.title}
            </Text>

            <Touchable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setTimeout(() => onPress && onPress(book), 350);
              }}
            >
              <Ionicons name="book-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Abrir para Leitura</Text>
            </Touchable>

            {onEdit && (
              <Touchable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setEditVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={20} color={colors.secondary} />
                <Text style={styles.menuItemText}>Editar Livro</Text>
              </Touchable>
            )}

            {onToggleLock && !isChest && (
              <Touchable
                style={styles.menuItem}
                onPress={() => {
                setMenuVisible(false);
                setTimeout(() => onToggleLock(book), 350);
                }}
              >
                <Ionicons
                  name={book.locked ? 'lock-open-outline' : 'finger-print-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.menuItemText}>
                  {book.locked ? 'Remover proteção' : 'Proteger com biometria'}
                </Text>
              </Touchable>
            )}

            {onExport && (
              <Touchable
                style={styles.menuItem}
                onPress={() => {
                setMenuVisible(false);
                setTimeout(() => onExport(book, 'txt'), 350);
                }}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>Exportar como TXT</Text>
              </Touchable>
            )}

            {onExport && (
              <Touchable
                style={styles.menuItem}
                onPress={() => {
                setMenuVisible(false);
                setTimeout(() => onExport(book, 'json'), 350);
                }}
              >
                <Ionicons name="code-slash-outline" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>Exportar como JSON</Text>
              </Touchable>
            )}

            {!isOwn && (
              <Touchable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setHistoryVisible(true);
                }}
              >
                <Ionicons name="git-compare-outline" size={20} color={colors.accentGold} />
                <Text style={styles.menuItemText}>Histórico de Alterações</Text>
                {changeCount > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{changeCount}</Text>
                  </View>
                )}
              </Touchable>
            )}

            {!isChest ? (
              <Touchable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onMoveToChest && onMoveToChest(book.id);
                }}
              >
                <Ionicons name="archive-outline" size={20} color={colors.secondary} />
                <Text style={styles.menuItemText}>Mover para o Baú</Text>
              </Touchable>
            ) : (
              <Touchable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onRestore && onRestore(book.id);
                }}
              >
                <Ionicons name="arrow-up-circle-outline" size={20} color={colors.success} />
                <Text style={styles.menuItemText}>Restaurar para a Estante</Text>
              </Touchable>
            )}

            <Touchable
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => {
                setMenuVisible(false);
                onDelete && onDelete(book.id);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>
                Excluir Definitivamente
              </Text>
            </Touchable>
          </View>
        </Pressable>
      </Modal>

      <BookEditModal
        visible={editVisible}
        book={book}
        onCancel={() => setEditVisible(false)}
        onSave={async (updates) => {
          await onEdit(book.id, updates);
          setEditVisible(false);
        }}
      />

      <ChangeHistoryModal
        visible={historyVisible}
        book={book}
        onClose={() => setHistoryVisible(false)}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  cardContainer: {
    width: '48%',
    marginBottom: 20,
    alignItems: 'center',
  },
  coverWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBox: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingTop: 22,
    paddingBottom: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  selectOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'flex-start',
    padding: 8,
  },
  selectOverlayOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  selectCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCheckOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 155,
    paddingHorizontal: 4,
  },
  titleArea: {
    flex: 1,
    marginRight: 4,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'serif',
  },
  bookMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuContainer: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'serif',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.accentGold,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuItemDanger: {
    marginTop: 4,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
});
