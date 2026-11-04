import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BookCover from './BookCover';
import ChangeHistoryModal from './ChangeHistoryModal';
import BookEditModal from './BookEditModal';
import { colors } from '../theme/colors';

export default function BookCard({
  book,
  onPress,
  onMoveToChest,
  onRestore,
  onEdit,
  onExport,
  onDelete,
  isChest = false,
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const isOwn = book.isOwn !== false;
  const changeCount = book.changeLog?.length || 0;

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress && onPress(book)}
        style={styles.coverWrapper}
      >
        <BookCover
          title={book.title}
          coverColor={book.coverColor}
          titleColor={book.titleColor}
          totalPages={book.totalPages}
          size="medium"
        />
      </TouchableOpacity>

      <View style={styles.infoRow}>
        <TouchableOpacity
          style={styles.titleArea}
          onPress={() => onPress && onPress(book)}
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
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Action modal for options */}
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

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                onPress && onPress(book);
              }}
            >
              <Ionicons name="book-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Abrir para Leitura</Text>
            </TouchableOpacity>

            {onEdit && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setEditVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={20} color={colors.secondary} />
                <Text style={styles.menuItemText}>Editar Livro</Text>
              </TouchableOpacity>
            )}

            {onExport && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onExport(book, 'txt');
                }}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>Exportar como TXT</Text>
              </TouchableOpacity>
            )}

            {onExport && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onExport(book, 'json');
                }}
              >
                <Ionicons name="code-slash-outline" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>Exportar como JSON</Text>
              </TouchableOpacity>
            )}

            {!isOwn && (
              <TouchableOpacity
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
              </TouchableOpacity>
            )}

            {!isChest ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onMoveToChest && onMoveToChest(book.id);
                }}
              >
                <Ionicons name="archive-outline" size={20} color={colors.secondary} />
                <Text style={styles.menuItemText}>Mover para o Baú</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onRestore && onRestore(book.id);
                }}
              >
                <Ionicons name="arrow-up-circle-outline" size={20} color={colors.success} />
                <Text style={styles.menuItemText}>Restaurar para a Estante</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
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
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  cardContainer: {
    width: '48%',
    marginBottom: 20,
    alignItems: 'center',
  },
  coverWrapper: {
    alignItems: 'center',
    marginBottom: 8,
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
