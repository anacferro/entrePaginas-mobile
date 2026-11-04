import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  StatusBar,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Image,
  AppState,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChapterEditor from '../components/ChapterEditor';
import AnnotatedText from '../components/AnnotatedText';
import AiSummary from '../components/AiSummary';
import CommentsModal from '../components/CommentsModal';
import { paginate } from '../services/pagination';
import { bookFonts } from '../services/bookFonts';
import { fontFamilyFor, isDarkColor } from '../theme/bookOptions';
import { applyMark, clearMarks, HIGHLIGHT_COLORS, PIN_COLORS } from '../services/marks';
import { storage } from '../services/storage';
import { dialog } from '../services/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles, ThemeScope } from '../theme/ThemeContext';
import Touchable from '../components/Touchable';
import LoadingView from '../components/LoadingView';
import EmptyView from '../components/EmptyView';

export default function ReaderScreen(props) {
  const { isDark: appDark } = useTheme();
  const [readerDark, setReaderDark] = useState(appDark);

  return (
    <ThemeScope dark={readerDark}>
      <ReaderContent {...props} isDark={readerDark} setReaderDark={setReaderDark} />
    </ThemeScope>
  );
}

function ReaderContent({ route, navigation, isDark, setReaderDark }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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
  const [editorMode, setEditorMode] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [originalFontReady, setOriginalFontReady] = useState(false);
  const scrollRef = useRef(null);

  const [loadState, setLoadState] = useState(bookId ? 'loading' : 'missing');
  const savedPage = useRef(1);

  useEffect(() => {
    let active = true;
    async function loadBook() {
      const found = bookId ? await storage.getBookById(bookId) : null;
      if (!active) return;
      if (!found) {
        setLoadState('missing');
        return;
      }
      savedPage.current = await storage.getReadingPosition(bookId);
      if (!active) return;
      setCurrentPageIndex(savedPage.current - 1);
      setBook(found);
      setLoadState('ready');
    }
    loadBook().catch(() => active && setLoadState('missing'));
    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    if (book?.fontFamily !== 'original') return;
    bookFonts.load(book).then(setOriginalFontReady);
  }, [book]);

  const [fade] = useState(() => new Animated.Value(1));
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setSelection(null);
    fade.setValue(0.25);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [currentPageIndex, fade]);

  const handleSelect = useCallback((start, end) => {
    setSelection(end > start ? { start, end } : null);
  }, []);

  const emptyChapters = [{ id: 'empty', title: '', content: '' }];

  const chapters = book?.chapters && book.chapters.length > 0 ? book.chapters : emptyChapters;
  const pages = useMemo(() => paginate(chapters), [chapters]);
  const pageIndex = Math.min(currentPageIndex, pages.length - 1);
  const page = pages[pageIndex];
  const currentChapter = chapters[page.chapterIndex];
  const totalPages = pages.length;
  const currentPageNumber = pageIndex + 1;
  const isLastPage = pageIndex >= pages.length - 1;
  const firstPageOf = (chapterId, list = pages) => Math.max(0, list.findIndex(p => p.chapterId === chapterId));
  const pageForIndex = (idx) => firstPageOf(chapters[idx].id) + 1;

  const pageCount = pages.length;
  const pan = useMemo(() => {
    const go = (step) => setCurrentPageIndex(i => Math.max(0, Math.min(pageCount - 1, Math.min(i, pageCount - 1) + step)));
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !annotating && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) go(1);
        else if (g.dx > 50) go(-1);
      },
    });
  }, [annotating, pageCount]);

  const openNewChapter = () => {
    setShowSummary(false);
    setTimeout(() => setEditorMode('new'), 300);
  };

  useEffect(() => {
    if (!book?.locked) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') navigation.goBack();
    });
    return () => subscription.remove();
  }, [book?.locked, navigation]);

  const handleSaveChapter = async ({ title, content, photo }) => {
    if (editorMode === 'new') {
      const updated = await storage.addChapter(book.id, { title, content, photo });
      if (updated) {
        setBook(updated);
        setCurrentPageIndex(firstPageOf(updated.chapters[updated.chapters.length - 1].id, paginate(updated.chapters)));
      }
    } else {
      const updated = await storage.updateChapter(book.id, currentChapter.id, { title, content, photo });
      if (updated) setBook(updated);
    }
    setEditorMode(null);
  };

  const handleMoveChapter = async (chapterId, direction) => {
    const updated = await storage.moveChapter(book.id, chapterId, direction);
    if (!updated) return;
    const keepId = currentChapter.id;
    setBook(updated);
    setCurrentPageIndex(firstPageOf(keepId, paginate(updated.chapters)));
  };

  const isOwnBook = book?.isOwn !== false;
  const bookmarks = book?.bookmarks || [];
  const currentBookmark = bookmarks.find(bm => bm.chapterId === currentChapter.id && bm.page === currentPageNumber);

  const pageComments = (book?.comments || []).filter(cm => cm.page === currentPageNumber);

  const handleAddComment = async (text) => {
    const updated = await storage.addComment(book.id, { chapterId: currentChapter.id, page: currentPageNumber, text });
    if (updated) setBook({ ...updated });
  };

  const handleRemoveComment = async (commentId) => {
    const updated = await storage.removeComment(book.id, commentId);
    if (updated) setBook({ ...updated });
  };

  const toggleAnnotating = () => {
    setAnnotating(!annotating);
    setSelection(null);
    setShowTypography(false);
  };

  const applyFormat = async (type, color) => {
    if (!book || !selection) return;
    const content = currentChapter.content;
    const start = selection.start + page.start;
    const end = selection.end + page.start;
    const marks = type === 'clear'
      ? clearMarks(currentChapter.marks, content, start, end)
      : applyMark(currentChapter.marks, content, start, end, type, color);

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
    setCurrentPageIndex(Math.max(0, Math.min(pages.length - 1, bm.page - 1)));
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
              setCurrentPageIndex(Math.max(0, firstPageOf(currentChapter.id) - 1));
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (loadState !== 'ready' || !bookId || currentPageNumber === savedPage.current) return undefined;
    const timer = setTimeout(() => {
      savedPage.current = currentPageNumber;
      storage.setReadingPosition(bookId, currentPageNumber);
    }, 500);
    return () => clearTimeout(timer);
  }, [loadState, bookId, currentPageNumber]);

  const usesPaper = !isDark && !!book?.paperColor;
  const paperIsDark = usesPaper && isDarkColor(book.paperColor);
  const readerBg = usesPaper ? book.paperColor : colors.reader.background;
  const readerTextColor = paperIsDark ? '#EDE6DA' : colors.reader.text;
  const useOriginal = book?.fontFamily === 'original' && originalFontReady;
  const bodyFont = useOriginal ? book.customFont : fontFamilyFor(book?.fontFamily === 'original' ? book?.fontFallback : book?.fontFamily);

  if (loadState !== 'ready') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {loadState === 'loading' ? (
          <LoadingView message="Abrindo o livro..." />
        ) : (
          <EmptyView
            icon="book-outline"
            title="Livro não encontrado"
            description="Este livro não está mais disponível. Volte para a estante e abra outro."
            actionLabel="Voltar"
            onActionPress={() => navigation.goBack()}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: readerBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surfaceSoft} />
      
      {!focusMode && (
        <>
        <View style={[styles.readerNavHeader, { backgroundColor: colors.surfaceWarm }]}>
          <View style={styles.navTitleRow}>
          <Touchable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={20} color={readerTextColor} />
          </Touchable>

          <View style={styles.titleWrapper}>
            <Text style={[styles.bookHeaderTitle, { color: readerTextColor }]} numberOfLines={1}>
              {book?.title || bookTitle || 'Crônicas do Silêncio'}
            </Text>
            <Text style={[styles.chapterHeaderSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {currentChapter.title}
            </Text>
          </View>
          </View>

          <View style={styles.navIconsRow}>
            {book && (
              <Touchable
                style={styles.iconBtn}
                onPress={() => (isOwnBook ? setEditorMode('edit') : setShowComments(true))}
                accessibilityLabel={isOwnBook ? 'Editar capítulo' : 'Meus comentários'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={isOwnBook ? 'create-outline' : 'chatbubble-ellipses-outline'} size={20} color={readerTextColor} />
              </Touchable>
            )}

            {book && (
              <Touchable
                style={[styles.iconBtn, annotating && styles.iconBtnActive]}
                onPress={toggleAnnotating}
                accessibilityLabel="Marca-texto"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="brush-outline" size={20} color={annotating ? colors.onPrimary : readerTextColor} />
              </Touchable>
            )}

            <Touchable
              style={styles.iconBtn}
              onPress={() => {
                setShowTypography(false);
                setFocusMode(true);
              }}
              accessibilityLabel="Leitura sem distrações"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="expand-outline" size={20} color={readerTextColor} />
            </Touchable>

            <Touchable
              style={styles.iconBtn}
              onPress={() => {
                setSummaryTab('chapters');
                setShowSummary(true);
              }}
              accessibilityLabel="Sumário"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="list" size={20} color={readerTextColor} />
            </Touchable>

            <Touchable
              style={styles.iconBtn}
              onPress={() => setShowTypography(!showTypography)}
              accessibilityLabel="Tamanho do texto"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="text" size={20} color={readerTextColor} />
            </Touchable>

            {book && (
              <Touchable
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
              </Touchable>
            )}
          </View>
        </View>
        </>
      )}

      {showTypography && !focusMode && (
        <View style={[styles.typoBar, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.typoLabel, { color: readerTextColor }]}>Tamanho do Texto:</Text>
          <View style={styles.fontControlsRow}>
            <Touchable
              style={styles.fontBtn}
              onPress={() => setFontSize(Math.max(14, fontSize - 2))}
              accessibilityLabel="Diminuir texto"
            >
              <Text style={[styles.fontBtnText, { color: readerTextColor }]}>A-</Text>
            </Touchable>

            <Text style={[styles.fontSizeIndicator, { color: readerTextColor }]}>{fontSize}px</Text>

            <Touchable
              style={styles.fontBtn}
              onPress={() => setFontSize(Math.min(26, fontSize + 2))}
              accessibilityLabel="Aumentar texto"
            >
              <Text style={[styles.fontBtnText, { color: readerTextColor }]}>A+</Text>
            </Touchable>
          </View>

          <Touchable
            style={[styles.themePill, { backgroundColor: colors.card }]}
            onPress={() => setReaderDark(!isDark)}
            accessibilityLabel={isDark ? 'Usar leitor claro' : 'Usar leitor escuro'}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={15} color={readerTextColor} />
            <Text style={[styles.themePillText, { color: readerTextColor }]}>
              {isDark ? 'Claro' : 'Escuro'}
            </Text>
          </Touchable>
        </View>
      )}

      <View style={styles.readerScroll} {...pan.panHandlers}>
        <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView
          ref={scrollRef}
          style={styles.readerScroll}
          contentContainerStyle={[styles.readerContentContainer, annotating && { paddingBottom: 170 }, focusMode && { paddingTop: 68 }]}
        >
          {currentBookmark && (
            <Touchable style={styles.bookmarkNote} onPress={openBookmarkSheet} activeOpacity={0.7}>
              <Ionicons name="bookmark" size={13} color={currentBookmark.color} />
              <Text style={[styles.bookmarkNoteText, { color: currentBookmark.color }]} numberOfLines={1}>
                {currentBookmark.title}
              </Text>
            </Touchable>
          )}

          <AiSummary chapter={currentChapter} />

          {page.photo && (
            <Image
              source={{ uri: page.photo }}
              style={styles.pagePhoto}
              resizeMode="contain"
              accessibilityLabel="Foto da página"
            />
          )}

          <AnnotatedText
            content={page.content}
            marks={page.marks}
            annotating={annotating}
            onSelect={handleSelect}
            style={[
              styles.bookParagraphs,
              {
                color: readerTextColor,
                fontSize: fontSize,
                lineHeight: fontSize * 1.68,
                fontFamily: bodyFont,
              },
            ]}
          />

          {pageComments.length > 0 && (
            <View style={[styles.pageComments, { borderColor: colors.border }]}>
              {pageComments.map(cm => (
                <Touchable key={cm.id} onPress={() => setShowComments(true)} style={styles.pageComment}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                  <Text style={[styles.pageCommentText, { color: readerTextColor }]}>{cm.text}</Text>
                </Touchable>
              ))}
            </View>
          )}

          {book && isOwnBook && isLastPage && (
            <Touchable
              style={[styles.addChapterBtn, { borderColor: colors.border }]}
              onPress={openNewChapter}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={isDark ? readerTextColor : colors.primary} />
              <Text style={[styles.addChapterText, { color: isDark ? readerTextColor : colors.primary }]}>
                Escrever novo capítulo
              </Text>
            </Touchable>
          )}

          <View style={styles.pageFooter}>
            <Touchable
              style={[styles.pageNavBtn, pageIndex === 0 && { opacity: 0.3 }]}
              disabled={pageIndex === 0}
              onPress={() => setCurrentPageIndex(Math.max(0, pageIndex - 1))}
            >
              <Ionicons name="chevron-back" size={20} color={readerTextColor} />
              <Text style={[styles.pageNavText, { color: readerTextColor }]}>Anterior</Text>
            </Touchable>

            <View style={styles.pageIndicatorBox}>
              <Text style={[styles.pageCurrentText, { color: readerTextColor }]}>
                Página {currentPageNumber}
              </Text>
              <Text style={[styles.pageTotalText, { color: colors.textSecondary }]}>
                de {totalPages} {totalPages === 1 ? 'folha' : 'folhas'}
              </Text>
            </View>

            <Touchable
              style={[styles.pageNavBtn, isLastPage && { opacity: 0.3 }]}
              disabled={isLastPage}
              onPress={() => setCurrentPageIndex(Math.min(pages.length - 1, pageIndex + 1))}
            >
              <Text style={[styles.pageNavText, { color: readerTextColor }]}>Próxima</Text>
              <Ionicons name="chevron-forward" size={20} color={readerTextColor} />
            </Touchable>
          </View>
        </ScrollView>
        </Animated.View>

        {currentBookmark && (
          <Touchable style={styles.ribbon} onPress={openBookmarkSheet} activeOpacity={0.85}>
            <View style={[styles.ribbonBody, { backgroundColor: currentBookmark.color }]} />
            <View style={[styles.ribbonTail, { borderLeftColor: currentBookmark.color, borderRightColor: currentBookmark.color }]} />
          </Touchable>
        )}

        {annotating && (
          <View style={[styles.annotateBar, { backgroundColor: colors.surface }]}>
            <View style={styles.annotateHeader}>
              <Text style={[styles.annotateHint, { color: colors.textSecondary }]}>
                {selection
                  ? `${selection.end - selection.start} caracteres selecionados`
                  : Platform.OS === 'web'
                    ? 'Selecione um trecho arrastando o mouse'
                    : 'Toque e segure para selecionar um trecho'}
              </Text>
              <Touchable style={styles.annotateDone} onPress={toggleAnnotating}>
                <Text style={styles.annotateDoneText}>Concluir</Text>
              </Touchable>
            </View>

            <View style={[styles.annotateTools, !selection && { opacity: 0.4 }]}>
              {HIGHLIGHT_COLORS.map(item => (
                <Touchable
                  key={item.color}
                  style={[styles.markerDot, { backgroundColor: item.color }]}
                  onPress={() => applyFormat('highlight', item.color)}
                  disabled={!selection}
                  accessibilityLabel={`Grifar de ${item.label}`}
                />
              ))}

              <View style={styles.toolDivider} />

              <Touchable style={styles.toolBtn} onPress={() => applyFormat('bold')} disabled={!selection} accessibilityLabel="Negrito">
                <Text style={[styles.toolText, { color: readerTextColor, fontWeight: '800' }]}>B</Text>
              </Touchable>
              <Touchable style={styles.toolBtn} onPress={() => applyFormat('italic')} disabled={!selection} accessibilityLabel="Itálico">
                <Text style={[styles.toolText, { color: readerTextColor, fontStyle: 'italic' }]}>I</Text>
              </Touchable>
              <Touchable style={styles.toolBtn} onPress={() => applyFormat('underline')} disabled={!selection} accessibilityLabel="Sublinhado">
                <Text style={[styles.toolText, { color: readerTextColor, textDecorationLine: 'underline' }]}>U</Text>
              </Touchable>
              <Touchable style={styles.toolBtn} onPress={() => applyFormat('clear')} disabled={!selection} accessibilityLabel="Remover formatação">
                <Ionicons name="backspace-outline" size={19} color={readerTextColor} />
              </Touchable>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={showSummary}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSummary(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceWarm }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="list" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Sumário da Obra</Text>
              </View>
              <Touchable
                onPress={() => setShowSummary(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Fechar sumário"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Touchable>
            </View>

            {book && (
              <View style={styles.summaryTabs}>
                {[
                  { key: 'chapters', label: 'Capítulos' },
                  { key: 'bookmarks', label: `Marcadores (${bookmarks.length})` },
                ].map(tab => (
                  <Touchable
                    key={tab.key}
                    style={[styles.summaryTab, summaryTab === tab.key && styles.summaryTabActive]}
                    onPress={() => setSummaryTab(tab.key)}
                  >
                    <Text style={[styles.summaryTabText, summaryTab === tab.key && styles.summaryTabTextActive]}>
                      {tab.label}
                    </Text>
                  </Touchable>
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
                  <View key={bm.id} style={styles.tocItem}>
                    <Touchable style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => goToBookmark(bm)}>
                      <Ionicons name="bookmark" size={18} color={bm.color} style={{ width: 32 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tocItemTitle} numberOfLines={1}>{bm.title}</Text>
                        <Text style={styles.tocItemMeta} numberOfLines={1}>
                          {chapters.find(c => c.id === bm.chapterId)?.title} • Folha {bm.page}
                        </Text>
                      </View>
                    </Touchable>
                    <Touchable
                      onPress={() => handleRemoveBookmark(bm.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                    </Touchable>
                  </View>
                ))}
              </ScrollView>
            ) : (
            <ScrollView style={styles.tocList}>
              {chapters.map((chap, idx) => (
                <View
                  key={chap.id || idx}
                  style={[
                    styles.tocItem,
                    page.chapterIndex === idx && styles.tocItemActive,
                  ]}
                >
                  <Touchable
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setCurrentPageIndex(firstPageOf(chap.id));
                      setShowSummary(false);
                    }}
                  >
                    <Text style={[styles.tocItemNumber, page.chapterIndex === idx && styles.tocItemNumberActive]}>
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.tocItemTitle,
                          page.chapterIndex === idx && styles.tocItemTitleActive,
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
                    {page.chapterIndex === idx && (
                      <Ionicons name="book" size={16} color={colors.primary} />
                    )}
                  </Touchable>
                  {book && isOwnBook && chapters.length > 1 && (
                    <View style={styles.tocMove}>
                      <Touchable
                        onPress={() => handleMoveChapter(chap.id, -1)}
                        disabled={idx === 0}
                        hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                        accessibilityLabel={`Subir capítulo ${idx + 1}`}
                      >
                        <Ionicons name="chevron-up" size={20} color={idx === 0 ? colors.border : colors.textSecondary} />
                      </Touchable>
                      <Touchable
                        onPress={() => handleMoveChapter(chap.id, 1)}
                        disabled={idx === chapters.length - 1}
                        hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                        accessibilityLabel={`Descer capítulo ${idx + 1}`}
                      >
                        <Ionicons name="chevron-down" size={20} color={idx === chapters.length - 1 ? colors.border : colors.textSecondary} />
                      </Touchable>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            )}

            {book && isOwnBook && summaryTab === 'chapters' && (
              <Touchable style={styles.tocAddBtn} onPress={openNewChapter} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.tocAddText}>Novo Capítulo</Text>
              </Touchable>
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
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceWarm }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="bookmark" size={20} color={bookmarkColor} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>{currentBookmark ? 'Página Marcada' : 'Marcar Página'}</Text>
              </View>
              <Touchable
                onPress={() => setShowBookmarkSheet(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Fechar marcador"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Touchable>
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
              {PIN_COLORS.map((color, index) => (
                <Touchable
                  key={color}
                  accessibilityLabel={`Cor do marcador ${index + 1}`}
                  onPress={() => setBookmarkColor(color)}
                  style={[styles.pinOption, bookmarkColor === color && { borderColor: color }]}
                >
                  <Ionicons name="bookmark" size={22} color={color} />
                </Touchable>
              ))}
            </View>

            <Text style={styles.sheetMeta}>
              {currentChapter.title} • Folha {currentPageNumber}
            </Text>

            <Touchable style={styles.tocAddBtn} onPress={handleSaveBookmark} activeOpacity={0.85}>
              <Ionicons name="bookmark" size={16} color={colors.onPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.tocAddText}>{currentBookmark ? 'Atualizar Marcador' : 'Marcar Página'}</Text>
            </Touchable>

            {currentBookmark && (
              <Touchable
                style={styles.removePinBtn}
                onPress={() => handleRemoveBookmark(currentBookmark.id)}
              >
                <Text style={styles.removePinText}>Remover marcador</Text>
              </Touchable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ChapterEditor
        visible={editorMode !== null}
        chapter={editorMode === 'edit' ? currentChapter : null}
        chapterNumber={editorMode === 'edit' ? page.chapterIndex + 1 : chapters.length + 1}
        onCancel={() => setEditorMode(null)}
        onSave={handleSaveChapter}
        onDelete={handleDeleteChapter}
      />
      <CommentsModal
        visible={showComments}
        book={book}
        pageNumber={currentPageNumber}
        onAdd={handleAddComment}
        onRemove={handleRemoveComment}
        onClose={() => setShowComments(false)}
      />
      {focusMode && (
        <Touchable
          style={[styles.focusExit, { backgroundColor: colors.surfaceMuted }]}
          onPress={() => setFocusMode(false)}
          accessibilityLabel="Mostrar menus"
        >
          <Ionicons name="contract-outline" size={20} color={readerTextColor} />
        </Touchable>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  pageComments: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  pageComment: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  pageCommentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  focusExit: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  safeArea: {
    flex: 1,
  },
  readerNavHeader: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  navTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'space-between',
    marginTop: 4,
  },
  iconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
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
    color: colors.onPrimary,
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
    backgroundColor: colors.surfaceMuted,
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
    color: colors.onPrimary,
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.card,
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
  pagePhoto: {
    width: '100%',
    height: 320,
    borderRadius: 8,
    marginBottom: 16,
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
  tocMove: {
    marginLeft: 10,
    alignItems: 'center',
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
    color: colors.onPrimary,
  },
});
