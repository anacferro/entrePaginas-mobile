import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import ChapterEditor from '../components/ChapterEditor';
import AnnotatedText from '../components/AnnotatedText';
import { applyMark, clearMarks, HIGHLIGHT_COLORS, PIN_COLORS } from '../services/marks';
import { storage } from '../services/storage';
import { dialog } from '../services/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function ReaderScreen({ route, navigation }) {
  // Navigation parameter passing: bookId, bookTitle
  const { bookId, bookTitle } = route.params || {};

  const [book, setBook] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryTab, setSummaryTab] = useState('chapters');
  const [showBookmarkSheet, setShowBookmarkSheet] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkColor, setBookmarkColor] = useState(PIN_COLORS[0]);
  const [annotating, setAnnotating] = useState(false);
  const [selection, setSelection] = useState(null);
  const [showTypography, setShowTypography] = useState(false);
  const [themeMode, setThemeMode] = useState('light'); // 'light' | 'dark'
  const [editorMode, setEditorMode] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadBook() {
      if (bookId) {
        const found = await storage.getBookById(bookId);
        if (found) {
          setBook(found);
        }
      }
      const user = await storage.getUserProfile();
      if (user?.readerTheme) {
        setThemeMode(user.readerTheme);
      }
    }
    loadBook();
  }, [bookId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setSelection(null);
  }, [currentPageIndex]);

  const handleSelect = useCallback((start, end) => {
    setSelection(end > start ? { start, end } : null);
  }, []);

  const defaultChapters = [
    {
      id: 'p1',
      title: 'Capítulo I: O Pórtico das Sombras',
      content:
        'Ao abrir na trigésima oitava página, um fragmento de pergaminho solto deslizou sobre o tampo da escrivaninha. Era um mapa estelar com tintas vegetais desbotadas, indicando as constelações que outrora vigiavam o Vale das Névoas. O silêncio da abóbada era denso, quebrado unicamente pelo roçar metódico de seu polegar sobre a borda áspera das folhas costuradas.\n\nNão havia pressa naquele refúgio. O tempo desdobrava-se em camadas, como as folhas de guarda marmorizadas dos velhos compêndios. Sentou-se na cadeira estofada em veludo desgastado, acendeu a lamparina de latão ao lado do tinteiro e permitiu que a penumbra acolhesse seus pensamentos mais íntimos.\n\nAproximando a chama da margem inferior, vislumbrou anotações à pena em caligrafia miúda: coordenadas para a sala secreta das matrizes tipográficas. Seus olhos cintilaram com a certeza de que a jornada estava apenas começando.',
    },
    {
      id: 'p2',
      title: 'Capítulo II: O Cântico das Marés Submersas',
      content:
        'Na manhã seguinte, a brisa marinha trouxe o cheiro de salitre misturado ao cedro das estantes ancestrais. Cada volume descansava em seu nicho de carvalho como sentinela de um tempo sem pressa.\n\nEle sabia que a biblioteca não guardava apenas palavras; guardava a respiração suspensa daqueles que ousaram registrar seus sonhos antes que o mar levasse a praia.',
    },
  ];

  const chapters = book?.chapters && book.chapters.length > 0 ? book.chapters : defaultChapters;
  const currentChapter = chapters[currentPageIndex] || chapters[0];
  const totalPages = book?.totalPages || 82;
  const pageForIndex = (idx) => Math.floor((idx / chapters.length) * totalPages) + 1;
  const currentPageNumber = pageForIndex(currentPageIndex);
  const isLastChapter = currentPageIndex >= chapters.length - 1;

  const openNewChapter = () => {
    setShowSummary(false);
    setTimeout(() => setEditorMode('new'), 300);
  };

  const handleSaveChapter = async ({ title, content }) => {
    if (editorMode === 'new') {
      const updated = await storage.addChapter(book.id, { title, content });
      if (updated) {
        setBook(updated);
        setCurrentPageIndex(updated.chapters.length - 1);
      }
    } else {
      const updated = await storage.updateChapter(book.id, currentChapter.id, { title, content });
      if (updated) setBook(updated);
    }
    setEditorMode(null);
  };

  const isOwnBook = book?.isOwn !== false;
  const bookmarks = book?.bookmarks || [];
  const currentBookmark = bookmarks.find(bm => bm.chapterId === currentChapter.id);

  const toggleAnnotating = () => {
    setAnnotating(!annotating);
    setSelection(null);
    setShowTypography(false);
  };

  const applyFormat = async (type, color) => {
    if (!book || !selection) return;
    const content = currentChapter.content;
    const marks = type === 'clear'
      ? clearMarks(currentChapter.marks, content, selection.start, selection.end)
      : applyMark(currentChapter.marks, content, selection.start, selection.end, type, color);

    setBook(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => (c.id === currentChapter.id ? { ...c, marks } : c)),
    }));
    setSelection(null);
    if (Platform.OS === 'web') window.getSelection()?.removeAllRanges();
    await storage.updateChapterMarks(book.id, currentChapter.id, marks);
  };

  const openBookmarkSheet = () => {
    setBookmarkTitle(currentBookmark?.title || currentChapter.title);
    setBookmarkColor(currentBookmark?.color || PIN_COLORS[0]);
    setShowBookmarkSheet(true);
  };

  const handleSaveBookmark = async () => {
    const updated = await storage.addBookmark(book.id, {
      chapterId: currentChapter.id,
      title: bookmarkTitle,
      color: bookmarkColor,
      page: currentPageNumber,
    });
    if (updated) setBook(updated);
    setShowBookmarkSheet(false);
  };

  const handleRemoveBookmark = async (bookmarkId) => {
    const updated = await storage.removeBookmark(book.id, bookmarkId);
    if (updated) setBook(updated);
    setShowBookmarkSheet(false);
  };

  const goToBookmark = (bm) => {
    const idx = chapters.findIndex(c => c.id === bm.chapterId);
    if (idx !== -1) setCurrentPageIndex(idx);
    setShowSummary(false);
  };

  const handleDeleteChapter = () => {
    if (chapters.length <= 1) {
      dialog.alert('Capítulo Único', 'O livro precisa ter pelo menos um capítulo.');
      return;
    }
    dialog.alert(
      'Excluir Capítulo',
      `Deseja apagar "${currentChapter.title}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const updated = await storage.deleteChapter(book.id, currentChapter.id);
            setEditorMode(null);
            if (updated) {
              setBook(updated);
              setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
            }
          },
        },
      ]
    );
  };

  const isDark = themeMode === 'dark';
  const readerBg = isDark ? colors.reader.dark.background : colors.reader.light.background;
  const readerTextColor = isDark ? colors.reader.dark.text : colors.reader.light.text;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: readerBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surfaceSoft} />
      
      {/* App Header */}
      <Header
        subtitle="Leitura"
        onProfilePress={() => navigation.navigate('MainTabs', { screen: 'Perfil' })}
      />

      {/* Reader Specific Navigation Bar */}
      <View style={[styles.readerNavHeader, { backgroundColor: isDark ? '#242220' : colors.surfaceWarm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={readerTextColor} />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={[styles.bookHeaderTitle, { color: readerTextColor }]} numberOfLines={1}>
            {book?.title || bookTitle || 'Crônicas do Silêncio'}
          </Text>
          <Text style={[styles.chapterHeaderSubtitle, { color: isDark ? '#A8A099' : colors.textSecondary }]} numberOfLines={1}>
            {currentChapter.title}
          </Text>
        </View>

        {/* Action icons: Sumário, Tipografia, Marcador */}
        <View style={styles.navIconsRow}>
          {book && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setEditorMode('edit')}
              accessibilityLabel="Editar capítulo"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={20} color={readerTextColor} />
            </TouchableOpacity>
          )}

          {book && (
            <TouchableOpacity
              style={[styles.iconBtn, annotating && styles.iconBtnActive]}
              onPress={toggleAnnotating}
              accessibilityLabel="Marca-texto"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="brush-outline" size={20} color={annotating ? '#FFFFFF' : readerTextColor} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setSummaryTab('chapters');
              setShowSummary(true);
            }}
            accessibilityLabel="Sumário"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="list" size={20} color={readerTextColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowTypography(!showTypography)}
            accessibilityLabel="Tamanho do texto"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="text" size={20} color={readerTextColor} />
          </TouchableOpacity>

          {book && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={openBookmarkSheet}
              accessibilityLabel="Marcar página"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={currentBookmark ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={currentBookmark ? currentBookmark.color : readerTextColor}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Typography settings popup */}
      {showTypography && (
        <View style={[styles.typoBar, { backgroundColor: isDark ? '#2B2826' : '#EFE7DC' }]}>
          <Text style={[styles.typoLabel, { color: readerTextColor }]}>Tamanho do Texto:</Text>
          <View style={styles.fontControlsRow}>
            <TouchableOpacity
              style={styles.fontBtn}
              onPress={() => setFontSize(Math.max(14, fontSize - 2))}
            >
              <Text style={[styles.fontBtnText, { color: readerTextColor }]}>A-</Text>
            </TouchableOpacity>

            <Text style={[styles.fontSizeIndicator, { color: readerTextColor }]}>{fontSize}px</Text>

            <TouchableOpacity
              style={styles.fontBtn}
              onPress={() => setFontSize(Math.min(26, fontSize + 2))}
            >
              <Text style={[styles.fontBtnText, { color: readerTextColor }]}>A+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.themePill, { backgroundColor: isDark ? '#3D3835' : '#FFFFFF' }]}
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={15} color={readerTextColor} />
            <Text style={[styles.themePillText, { color: readerTextColor }]}>
              {isDark ? 'Claro' : 'Escuro'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reader Content Body */}
      <View style={styles.readerScroll}>
        <ScrollView
          ref={scrollRef}
          style={styles.readerScroll}
          contentContainerStyle={[styles.readerContentContainer, annotating && { paddingBottom: 170 }]}
        >
          {currentBookmark && (
            <TouchableOpacity style={styles.bookmarkNote} onPress={openBookmarkSheet} activeOpacity={0.7}>
              <Ionicons name="bookmark" size={13} color={currentBookmark.color} />
              <Text style={[styles.bookmarkNoteText, { color: currentBookmark.color }]} numberOfLines={1}>
                {currentBookmark.title}
              </Text>
            </TouchableOpacity>
          )}

          <AnnotatedText
            content={currentChapter.content}
            marks={currentChapter.marks}
            annotating={annotating}
            onSelect={handleSelect}
            style={[
              styles.bookParagraphs,
              {
                color: readerTextColor,
                fontSize: fontSize,
                lineHeight: fontSize * 1.68,
              },
            ]}
          />

          {book && isLastChapter && (
            <TouchableOpacity
              style={[styles.addChapterBtn, { borderColor: isDark ? '#3D3835' : colors.border }]}
              onPress={openNewChapter}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={isDark ? readerTextColor : colors.primary} />
              <Text style={[styles.addChapterText, { color: isDark ? readerTextColor : colors.primary }]}>
                Escrever novo capítulo
              </Text>
            </TouchableOpacity>
          )}

          {/* Page counter & Navigation footer */}
          <View style={styles.pageFooter}>
            <TouchableOpacity
              style={[styles.pageNavBtn, currentPageIndex === 0 && { opacity: 0.3 }]}
              disabled={currentPageIndex === 0}
              onPress={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
            >
              <Ionicons name="chevron-back" size={20} color={readerTextColor} />
              <Text style={[styles.pageNavText, { color: readerTextColor }]}>Anterior</Text>
            </TouchableOpacity>

            <View style={styles.pageIndicatorBox}>
              <Text style={[styles.pageCurrentText, { color: readerTextColor }]}>
                Página {currentPageNumber}
              </Text>
              <Text style={[styles.pageTotalText, { color: isDark ? '#9A928A' : colors.textSecondary }]}>
                de {totalPages} folhas
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.pageNavBtn, isLastChapter && { opacity: 0.3 }]}
              disabled={isLastChapter}
              onPress={() => setCurrentPageIndex(Math.min(chapters.length - 1, currentPageIndex + 1))}
            >
              <Text style={[styles.pageNavText, { color: readerTextColor }]}>Próxima</Text>
              <Ionicons name="chevron-forward" size={20} color={readerTextColor} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {currentBookmark && (
          <TouchableOpacity style={styles.ribbon} onPress={openBookmarkSheet} activeOpacity={0.85}>
            <View style={[styles.ribbonBody, { backgroundColor: currentBookmark.color }]} />
            <View style={[styles.ribbonTail, { borderLeftColor: currentBookmark.color, borderRightColor: currentBookmark.color }]} />
          </TouchableOpacity>
        )}

        {annotating && (
          <View style={[styles.annotateBar, { backgroundColor: isDark ? '#2B2826' : colors.surface }]}>
            <View style={styles.annotateHeader}>
              <Text style={[styles.annotateHint, { color: isDark ? '#A8A099' : colors.textSecondary }]}>
                {selection
                  ? `${selection.end - selection.start} caracteres selecionados`
                  : Platform.OS === 'web'
                    ? 'Selecione um trecho arrastando o mouse'
                    : 'Toque e segure para selecionar um trecho'}
              </Text>
              <TouchableOpacity style={styles.annotateDone} onPress={toggleAnnotating}>
                <Text style={styles.annotateDoneText}>Concluir</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.annotateTools, !selection && { opacity: 0.4 }]}>
              {HIGHLIGHT_COLORS.map(item => (
                <TouchableOpacity
                  key={item.color}
                  style={[styles.markerDot, { backgroundColor: item.color }]}
                  onPress={() => applyFormat('highlight', item.color)}
                  disabled={!selection}
                  accessibilityLabel={`Grifar de ${item.label}`}
                />
              ))}

              <View style={styles.toolDivider} />

              <TouchableOpacity style={styles.toolBtn} onPress={() => applyFormat('bold')} disabled={!selection}>
                <Text style={[styles.toolText, { color: readerTextColor, fontWeight: '800' }]}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => applyFormat('italic')} disabled={!selection}>
                <Text style={[styles.toolText, { color: readerTextColor, fontStyle: 'italic' }]}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => applyFormat('underline')} disabled={!selection}>
                <Text style={[styles.toolText, { color: readerTextColor, textDecorationLine: 'underline' }]}>U</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={() => applyFormat('clear')} disabled={!selection}>
                <Ionicons name="backspace-outline" size={19} color={readerTextColor} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Sumário Modal (Table of Contents) */}
      <Modal
        visible={showSummary}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSummary(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#242220' : colors.surfaceWarm }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="list" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Sumário da Obra</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSummary(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {book && (
              <View style={styles.summaryTabs}>
                {[
                  { key: 'chapters', label: 'Capítulos' },
                  { key: 'bookmarks', label: `Marcadores (${bookmarks.length})` },
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.summaryTab, summaryTab === tab.key && styles.summaryTabActive]}
                    onPress={() => setSummaryTab(tab.key)}
                  >
                    <Text style={[styles.summaryTabText, summaryTab === tab.key && styles.summaryTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {summaryTab === 'bookmarks' ? (
              <ScrollView style={styles.tocList}>
                {bookmarks.length === 0 && (
                  <Text style={styles.emptyBookmarks}>
                    Nenhuma página marcada. Toque no ícone de marcador no topo do leitor para marcar a página atual.
                  </Text>
                )}
                {bookmarks.map(bm => (
                  <TouchableOpacity key={bm.id} style={styles.tocItem} onPress={() => goToBookmark(bm)}>
                    <Ionicons name="bookmark" size={18} color={bm.color} style={{ width: 32 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tocItemTitle} numberOfLines={1}>{bm.title}</Text>
                      <Text style={styles.tocItemMeta} numberOfLines={1}>
                        {chapters.find(c => c.id === bm.chapterId)?.title} • Folha {bm.page}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveBookmark(bm.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
            <ScrollView style={styles.tocList}>
              {chapters.map((chap, idx) => (
                <TouchableOpacity
                  key={chap.id || idx}
                  style={[
                    styles.tocItem,
                    currentPageIndex === idx && styles.tocItemActive,
                  ]}
                  onPress={() => {
                    setCurrentPageIndex(idx);
                    setShowSummary(false);
                  }}
                >
                  <Text style={[styles.tocItemNumber, currentPageIndex === idx && styles.tocItemNumberActive]}>
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.tocItemTitle,
                        currentPageIndex === idx && styles.tocItemTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {chap.title}
                    </Text>
                    <Text style={styles.tocItemMeta}>Folha {pageForIndex(idx)}</Text>
                  </View>
                  {bookmarks.some(bm => bm.chapterId === chap.id) && (
                    <Ionicons
                      name="bookmark"
                      size={14}
                      color={bookmarks.find(bm => bm.chapterId === chap.id).color}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  {currentPageIndex === idx && (
                    <Ionicons name="book" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            )}

            {book && summaryTab === 'chapters' && (
              <TouchableOpacity style={styles.tocAddBtn} onPress={openNewChapter} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.tocAddText}>Novo Capítulo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showBookmarkSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookmarkSheet(false)}
      >
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#242220' : colors.surfaceWarm }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="bookmark" size={20} color={bookmarkColor} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>{currentBookmark ? 'Página Marcada' : 'Marcar Página'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBookmarkSheet(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetLabel}>Título da marcação</Text>
            <TextInput
              style={styles.sheetInput}
              value={bookmarkTitle}
              onChangeText={setBookmarkTitle}
              placeholder="Ex.: Parei aqui, Trecho favorito..."
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />

            <Text style={styles.sheetLabel}>Cor do pin</Text>
            <View style={styles.pinColorsRow}>
              {PIN_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setBookmarkColor(color)}
                  style={[styles.pinOption, bookmarkColor === color && { borderColor: color }]}
                >
                  <Ionicons name="bookmark" size={22} color={color} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sheetMeta}>
              {currentChapter.title} • Folha {currentPageNumber}
            </Text>

            <TouchableOpacity style={styles.tocAddBtn} onPress={handleSaveBookmark} activeOpacity={0.85}>
              <Ionicons name="bookmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.tocAddText}>{currentBookmark ? 'Atualizar Marcador' : 'Marcar Página'}</Text>
            </TouchableOpacity>

            {currentBookmark && (
              <TouchableOpacity
                style={styles.removePinBtn}
                onPress={() => handleRemoveBookmark(currentBookmark.id)}
              >
                <Text style={styles.removePinText}>Remover marcador</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ChapterEditor
        visible={editorMode !== null}
        chapter={editorMode === 'edit' ? currentChapter : null}
        chapterNumber={editorMode === 'edit' ? currentPageIndex + 1 : chapters.length + 1}
        isDark={isDark}
        notice={!isOwnBook ? 'Esta obra não é sua: as alterações ficarão registradas no histórico do livro.' : null}
        onCancel={() => setEditorMode(null)}
        onSave={handleSaveChapter}
        onDelete={handleDeleteChapter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  readerNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    padding: 4,
    marginRight: 10,
  },
  titleWrapper: {
    flex: 1,
  },
  bookHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  chapterHeaderSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  navIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 4,
    borderRadius: 8,
  },
  iconBtnActive: {
    backgroundColor: colors.secondary,
  },
  bookmarkNote: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginBottom: 14,
    marginRight: 30,
  },
  bookmarkNoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '600',
    fontFamily: 'serif',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: 18,
    alignItems: 'center',
  },
  ribbonBody: {
    width: 22,
    height: 38,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  ribbonTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 9,
    borderBottomColor: 'transparent',
  },
  annotateBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  annotateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  annotateHint: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  annotateDone: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  annotateDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  annotateTools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  toolDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  toolBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: {
    fontSize: 17,
    fontFamily: 'serif',
  },
  summaryTabs: {
    flexDirection: 'row',
    backgroundColor: '#EBE1D5',
    borderRadius: 20,
    padding: 3,
    marginBottom: 6,
  },
  summaryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 17,
  },
  summaryTabActive: {
    backgroundColor: colors.primary,
  },
  summaryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyBookmarks: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    lineHeight: 19,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  sheetInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 15,
    color: colors.text,
    fontFamily: 'serif',
  },
  pinColorsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pinOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sheetMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 14,
    fontStyle: 'italic',
  },
  removePinBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  removePinText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  typoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  typoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  fontControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fontBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  fontBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fontSizeIndicator: {
    fontSize: 12,
    fontWeight: '600',
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readerScroll: {
    flex: 1,
  },
  readerContentContainer: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 40,
  },
  bookParagraphs: {
    fontFamily: 'serif',
    letterSpacing: 0.2,
    textAlign: 'justify',
  },
  addChapterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 6,
  },
  addChapterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 48,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  pageNavText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageIndicatorBox: {
    alignItems: 'center',
  },
  pageCurrentText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  pageTotalText: {
    fontSize: 11,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'serif',
  },
  tocList: {
    marginTop: 6,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  tocItemActive: {
    backgroundColor: colors.primaryLight,
  },
  tocItemNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    width: 32,
    fontFamily: 'serif',
  },
  tocItemNumberActive: {
    color: colors.primary,
  },
  tocItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tocItemTitleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tocItemMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tocAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: 12,
    marginTop: 10,
  },
  tocAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
