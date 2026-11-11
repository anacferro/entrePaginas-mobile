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
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChapterEditor from '../components/ChapterEditor';
import AnnotatedText from '../components/AnnotatedText';
import AiMenu from '../components/AiMenu';
import AskBook from '../components/AskBook';
import CharacterMapModal from '../components/CharacterMapModal';
import ExplainPassage from '../components/ExplainPassage';
import PinExcerptSheet from '../components/PinExcerptSheet';
import { ai } from '../services/ai';
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
import ReadingProgressModal from '../components/ReadingProgressModal';
import RatingSheet from '../components/RatingSheet';
import { bookWorkId } from '../services/catalog/identity';
import ProgressBar from '../components/ProgressBar';
import { useToast } from '../components/Toast';
import ReaderSettings from '../components/ReaderSettings';
import { bookForecast } from '../services/readingStats';
import { readerThemeOf } from '../theme/readerThemes';
import { DEFAULT_READER_PREFS, WIDTHS, PARAGRAPH_GAPS, normalizePrefs } from '../services/readerPrefs';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export default function ReaderScreen(props) {
  const { isDark: appDark } = useTheme();
  const prefsBookId = props.route?.params?.bookId;
  const [prefs, setPrefs] = useState(null);
  const latest = useRef(null);
  const dirty = useRef(false);

  useEffect(() => {
    let active = true;
    setPrefs(null);
    dirty.current = false;
    storage.getReaderPrefs(prefsBookId)
      .then((loaded) => active && setPrefs(loaded))
      .catch(() => active && setPrefs(normalizePrefs(null)));
    return () => {
      active = false;
    };
  }, [prefsBookId]);

  const updatePrefs = useCallback((patch) => {
    setPrefs((current) => {
      const next = normalizePrefs({ ...current, ...patch });
      latest.current = next;
      dirty.current = true;
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => updatePrefs({ ...DEFAULT_READER_PREFS }), [updatePrefs]);

  useEffect(() => {
    if (!dirty.current) return undefined;
    const timer = setTimeout(() => {
      dirty.current = false;
      storage.setReaderPrefs(prefsBookId, latest.current).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [prefs, prefsBookId]);

  useEffect(() => () => {
    if (dirty.current) storage.setReaderPrefs(prefsBookId, latest.current).catch(() => {});
  }, [prefsBookId]);

  if (!prefs) return <View style={{ flex: 1, backgroundColor: appDark ? '#0F1A15' : '#FAF8F1' }} />;

  const chosen = readerThemeOf(prefs.theme);
  const readerDark = chosen ? chosen.dark : appDark;

  return (
    <ThemeScope dark={readerDark}>
      <ReaderContent {...props} isDark={readerDark} prefs={prefs} updatePrefs={updatePrefs} resetPrefs={resetPrefs} />
    </ThemeScope>
  );
}

const NO_BOOKMARKS = [];

function ReaderContent({ route, navigation, isDark, prefs, updatePrefs, resetPrefs }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { bookId, bookTitle } = route.params || {};
  const toast = useToast();

  const [book, setBook] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryTab, setSummaryTab] = useState('chapters');
  const [showBookmarkSheet, setShowBookmarkSheet] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkColor, setBookmarkColor] = useState(PIN_COLORS[0]);
  const [annotating, setAnnotating] = useState(false);
  const [selection, setSelection] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiPanel, setAiPanel] = useState(null);
  const [explainFor, setExplainFor] = useState(null);
  const [pinFor, setPinFor] = useState(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [editorMode, setEditorMode] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [originalFontReady, setOriginalFontReady] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [personal, setPersonal] = useState(null);
  const [readingLog, setReadingLog] = useState(null);
  const lastPage = useRef(null);
  const lastTick = useRef(0);
  const opened = useRef(false);
  const wasFinished = useRef(false);
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

  useEffect(() => {
    if (!prefs.keepAwake) return undefined;
    activateKeepAwakeAsync('reader').catch(() => {});
    return () => {
      deactivateKeepAwake('reader').catch(() => {});
    };
  }, [prefs.keepAwake]);

  const [chrome] = useState(() => new Animated.Value(1));
  const chromeShown = !prefs.autoHide || chromeVisible || showSettings || annotating;
  useEffect(() => {
    Animated.timing(chrome, { toValue: chromeShown ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [chromeShown, chrome]);

  useEffect(() => {
    if (!prefs.autoHide || !chromeVisible || showSettings || annotating) return undefined;
    const timer = setTimeout(() => setChromeVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [prefs.autoHide, chromeVisible, showSettings, annotating]);

  const handleTapText = () => {
    if (prefs.autoHide && !annotating) setChromeVisible((v) => !v);
  };

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
  const bookmarks = book?.bookmarks ?? NO_BOOKMARKS;
  const currentBookmark = bookmarks.find(bm => bm.chapterId === currentChapter.id && bm.page === currentPageNumber);

  const excerptMarks = useMemo(() => {
    const list = [];
    chapters.forEach((chap) => {
      (chap.marks || []).filter((m) => m.type === 'highlight' || m.type === 'pin').forEach((m) => {
        let at = 0;
        pages.forEach((pg, i) => {
          if (pg.chapterId === chap.id && pg.start <= m.start) at = i;
        });
        list.push({ ...m, chapterId: chap.id, chapterTitle: chap.title, pageIndex: at });
      });
    });
    return list.sort((a, b) => a.pageIndex - b.pageIndex || a.start - b.start);
  }, [chapters, pages]);
  const highlights = useMemo(() => excerptMarks.filter((m) => m.type === 'highlight'), [excerptMarks]);
  const savedPins = useMemo(() => excerptMarks.filter((m) => m.type === 'pin'), [excerptMarks]);
  const markerItems = useMemo(() => [
    ...bookmarks.map((bm) => ({ kind: 'page', key: bm.id, bm, pageIndex: Math.max(0, bm.page - 1) })),
    ...savedPins.map((pin) => ({ kind: 'pin', key: pin.id, pin, pageIndex: pin.pageIndex })),
  ].sort((a, b) => a.pageIndex - b.pageIndex), [bookmarks, savedPins]);

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
    setShowSettings(false);
  };

  const openExplain = () => {
    if (!selection) return;
    const text = page.content.slice(selection.start, selection.end).trim();
    if (!text) return;
    setExplainFor({ text: text.length > 1500 ? `${text.slice(0, 1500)}...` : text, pageIndex });
  };

  const goToPageIndex = (idx) => setCurrentPageIndex(Math.max(0, Math.min(pages.length - 1, idx)));

  const openPin = () => {
    if (!selection) return;
    const text = page.content.slice(selection.start, selection.end).trim();
    if (!text) return;
    setPinFor({ text: text.length > 600 ? `${text.slice(0, 600)}...` : text, start: selection.start, end: selection.end });
  };

  const savePin = async ({ title, color }) => {
    if (!book || !pinFor) return;
    const content = currentChapter.content;
    const start = pinFor.start + page.start;
    const end = pinFor.end + page.start;
    const marks = applyMark(currentChapter.marks, content, start, end, 'pin', color, title);
    setBook(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => (c.id === currentChapter.id ? { ...c, marks } : c)),
    }));
    setPinFor(null);
    setSelection(null);
    if (Platform.OS === 'web') window.getSelection()?.removeAllRanges();
    await storage.updateChapterMarks(book.id, currentChapter.id, marks);
    toast.show('Trecho marcado.');
  };

  const removeMarkById = async (chapterId, markId) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter || !book) return;
    const marks = (chapter.marks || []).filter((m) => m.id !== markId);
    setBook(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => (c.id === chapterId ? { ...c, marks } : c)),
    }));
    await storage.updateChapterMarks(book.id, chapterId, marks);
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

  const flushTime = useCallback(() => {
    if (lastTick.current === 0) return;
    const now = Date.now();
    const seconds = (now - lastTick.current) / 1000;
    lastTick.current = now;
    if (bookId && seconds >= 1) storage.addReadingTime(bookId, seconds).catch(() => {});
  }, [bookId]);

  useEffect(() => {
    if (loadState !== 'ready' || !bookId || opened.current) return;
    opened.current = true;
    storage.openReading(bookId, totalPages)
      .then((log) => {
        wasFinished.current = !!log.books[bookId]?.finishedAt;
        lastPage.current = savedPage.current;
        lastTick.current = Date.now();
        setReadingLog(log);
      })
      .catch(() => {});
    storage.getPersonal().then(setPersonal).catch(() => {});
  }, [loadState, bookId, totalPages]);

  const concludeBook = useCallback(async () => {
    try {
      await storage.moveToChest(bookId);
      const p = await storage.getPersonal();
      setPersonal(p);
      if (book && !p.ratings[bookWorkId(book)]) setShowRating(true);
    } catch {
      toast.show('Não foi possível guardar o livro no Baú.', 'error');
    }
  }, [bookId, book, toast]);

  useEffect(() => {
    if (loadState !== 'ready' || !bookId || lastPage.current === null || lastPage.current === currentPageNumber) return;
    const from = lastPage.current;
    lastPage.current = currentPageNumber;
    flushTime();
    storage.recordReadingStep(bookId, from, currentPageNumber, totalPages)
      .then((log) => {
        setReadingLog(log);
        if (!wasFinished.current && log.books[bookId]?.finishedAt) {
          wasFinished.current = true;
          toast.show('Leitura concluída. Parabéns! O livro foi para o Baú.');
          concludeBook();
        }
      })
      .catch(() => {});
  }, [loadState, bookId, currentPageNumber, totalPages, flushTime, toast, concludeBook]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') lastTick.current = lastTick.current === 0 ? 0 : Date.now();
      else flushTime();
    });
    return () => {
      subscription.remove();
      flushTime();
    };
  }, [flushTime]);

  const handleRegisterPage = async (target) => {
    try {
      setCurrentPageIndex(target - 1);
      lastPage.current = target;
      const log = await storage.registerReadingPage(bookId, target, totalPages);
      setReadingLog(log);
      setShowProgress(false);
      if (!wasFinished.current && log.books[bookId]?.finishedAt) {
        wasFinished.current = true;
        toast.show('Leitura concluída. Parabéns! O livro foi para o Baú.');
        concludeBook();
      } else {
        toast.show(`Página ${target} registrada.`);
      }
    } catch {
      toast.show('Não foi possível registrar a página. Tente de novo.', 'error');
    }
  };

  const handleToggleFinished = async (finished) => {
    try {
      const log = await storage.setReadingFinished(bookId, finished, totalPages);
      wasFinished.current = finished;
      setReadingLog(log);
      setShowProgress(false);
      if (finished) {
        toast.show('Livro marcado como lido e guardado no Baú.');
        concludeBook();
      } else {
        await storage.restoreFromChest(bookId);
        toast.show('Livro voltou para "lendo" e para a estante.');
      }
    } catch {
      toast.show('Não foi possível atualizar o livro. Tente de novo.', 'error');
    }
  };

  const handleToggleAbandoned = async (abandoned) => {
    try {
      const log = await storage.setReadingAbandoned(bookId, abandoned);
      setReadingLog(log);
      setShowProgress(false);
      toast.show(abandoned ? 'Leitura marcada como abandonada.' : 'Leitura retomada.');
    } catch {
      toast.show('Não foi possível atualizar o livro. Tente de novo.', 'error');
    }
  };

  const chosenTheme = readerThemeOf(prefs.theme);
  const usesPaper = !chosenTheme && !isDark && !!book?.paperColor;
  const paperIsDark = usesPaper && isDarkColor(book.paperColor);
  const readerBg = chosenTheme ? chosenTheme.background : usesPaper ? book.paperColor : colors.reader.background;
  const readerTextColor = chosenTheme ? chosenTheme.text : paperIsDark ? '#EDE6DA' : colors.reader.text;
  const mutedColor = chosenTheme ? chosenTheme.muted : colors.textSecondary;
  const barColor = chosenTheme ? chosenTheme.bar : colors.surfaceWarm;
  const widthMax = WIDTHS.find((w) => w.id === prefs.width)?.max ?? null;
  const gapEm = PARAGRAPH_GAPS.find((g) => g.id === prefs.paragraphGap)?.em ?? 0.8;
  const useOriginal = book?.fontFamily === 'original' && originalFontReady;
  const bookFont = useOriginal ? book.customFont : fontFamilyFor(book?.fontFamily === 'original' ? book?.fontFallback : book?.fontFamily);
  const bodyFont = prefs.fontFamily === 'livro' ? bookFont : fontFamilyFor(prefs.fontFamily);
  const fontSize = prefs.fontSize;

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
        <Animated.View
          style={prefs.autoHide ? [styles.floatHeader, { opacity: chrome }] : undefined}
          pointerEvents={chromeShown ? 'auto' : 'none'}
        >
        <View style={[styles.readerNavHeader, { backgroundColor: barColor }]}>
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
            <Text style={[styles.chapterHeaderSubtitle, { color: mutedColor }]} numberOfLines={1}>
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
                setShowSettings(false);
                setFocusMode(true);
              }}
              accessibilityLabel="Leitura sem distrações"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="expand-outline" size={20} color={readerTextColor} />
            </Touchable>

            {ai.isAvailable && (
              <Touchable
                style={styles.iconBtn}
                onPress={() => setShowAiMenu(true)}
                accessibilityLabel="Companheira de leitura"
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="sparkles-outline" size={20} color={readerTextColor} />
              </Touchable>
            )}

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
              onPress={() => setShowSettings(!showSettings)}
              accessibilityLabel="Aparência e texto"
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
        </Animated.View>
      )}

      <View style={styles.readerScroll} {...pan.panHandlers}>
        <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView
          ref={scrollRef}
          style={styles.readerScroll}
          contentContainerStyle={[
            styles.readerContentContainer,
            { paddingHorizontal: prefs.margin },
            prefs.autoHide && !focusMode && { paddingTop: 96 },
            annotating && { paddingBottom: 170 },
            focusMode && { paddingTop: 68 },
          ]}
        >
          <View style={[styles.column, widthMax && { maxWidth: widthMax }]}>
          {currentBookmark && (
            <Touchable style={styles.bookmarkNote} onPress={openBookmarkSheet} activeOpacity={0.7}>
              <Ionicons name="bookmark" size={13} color={currentBookmark.color} />
              <Text style={[styles.bookmarkNoteText, { color: currentBookmark.color }]} numberOfLines={1}>
                {currentBookmark.title}
              </Text>
            </Touchable>
          )}


          {page.photo && (
            <Image
              source={{ uri: page.photo }}
              style={styles.pagePhoto}
              resizeMode="contain"
              accessibilityLabel="Foto da página"
            />
          )}

          <Pressable onPress={handleTapText} accessible={false}>
          <AnnotatedText
            content={page.content}
            marks={page.marks}
            annotating={annotating}
            onSelect={handleSelect}
            paragraphGap={fontSize * gapEm}
            style={[
              styles.bookParagraphs,
              {
                color: readerTextColor,
                fontSize: fontSize,
                lineHeight: fontSize * prefs.lineHeight,
                fontFamily: bodyFont,
                textAlign: prefs.align,
              },
            ]}
          />
          </Pressable>

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

            <Touchable
              style={styles.pageIndicatorBox}
              onPress={() => setShowProgress(true)}
              accessibilityLabel={`Página ${currentPageNumber} de ${totalPages}. Abrir progresso de leitura`}
            >
              <Text style={[styles.pageCurrentText, { color: readerTextColor }]}>
                Página {currentPageNumber}
              </Text>
              <Text style={[styles.pageTotalText, { color: mutedColor }]}>
                de {totalPages} {totalPages === 1 ? 'folha' : 'folhas'} · {Math.round((currentPageNumber / totalPages) * 100)}%{totalPages > currentPageNumber ? ` · faltam ${totalPages - currentPageNumber}` : ''}
              </Text>
              <ProgressBar value={currentPageNumber / totalPages} height={4} style={styles.footerProgress} label="Progresso do livro" />
            </Touchable>

            <Touchable
              style={[styles.pageNavBtn, isLastPage && { opacity: 0.3 }]}
              disabled={isLastPage}
              onPress={() => setCurrentPageIndex(Math.min(pages.length - 1, pageIndex + 1))}
            >
              <Text style={[styles.pageNavText, { color: readerTextColor }]}>Próxima</Text>
              <Ionicons name="chevron-forward" size={20} color={readerTextColor} />
            </Touchable>
          </View>
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
                    ? 'Selecione um trecho arrastando o mouse (grife ou peça uma explicação)'
                    : 'Toque e segure para selecionar um trecho'}
              </Text>
              {ai.isAvailable && (
                <Touchable
                  style={[styles.explainBtn, !selection && { opacity: 0.4 }]}
                  onPress={openExplain}
                  disabled={!selection}
                  accessibilityLabel="Explique este trecho"
                >
                  <Ionicons name="sparkles" size={13} color={colors.primary} />
                  <Text style={styles.explainText}>Explicar</Text>
                </Touchable>
              )}
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

              <Touchable style={styles.toolBtn} onPress={openPin} disabled={!selection} accessibilityLabel="Marcar trecho com pino">
                <Ionicons name="bookmark-outline" size={19} color={readerTextColor} />
              </Touchable>
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

      {prefs.dim > 0 && (
        <View pointerEvents="none" style={[styles.dim, { backgroundColor: `rgba(0,0,0,${prefs.dim})` }]} />
      )}

      {showSettings && !focusMode && (
        <ReaderSettings
          prefs={prefs}
          onChange={updatePrefs}
          onReset={resetPrefs}
          onClose={() => setShowSettings(false)}
          preview={{ background: readerBg, text: readerTextColor }}
          previewFont={bodyFont}
        />
      )}

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
                  { key: 'bookmarks', label: `Marcadores (${markerItems.length})` },
                  { key: 'highlights', label: `Grifos (${highlights.length})` },
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

            {summaryTab === 'highlights' ? (
              <ScrollView style={styles.tocList}>
                {highlights.length === 0 && (
                  <Text style={styles.emptyBookmarks}>
                    Nenhum trecho grifado. Use o marca-texto no topo do leitor para selecionar e grifar trechos.
                  </Text>
                )}
                {highlights.map((h) => (
                  <View key={h.id} style={styles.tocItem}>
                    <Touchable
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => {
                        setCurrentPageIndex(h.pageIndex);
                        setShowSummary(false);
                      }}
                    >
                      <View style={[styles.highlightBar, { backgroundColor: h.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tocItemTitle} numberOfLines={3}>{h.text}</Text>
                        <Text style={styles.tocItemMeta} numberOfLines={1}>{h.chapterTitle} • Folha {h.pageIndex + 1}</Text>
                      </View>
                    </Touchable>
                    <Touchable
                      onPress={() => removeMarkById(h.chapterId, h.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Remover grifo"
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                    </Touchable>
                  </View>
                ))}
              </ScrollView>
            ) : summaryTab === 'bookmarks' ? (
              <ScrollView style={styles.tocList}>
                {markerItems.length === 0 && (
                  <Text style={styles.emptyBookmarks}>
                    Nada marcado ainda. Toque no marcador no topo para marcar a página, ou selecione um trecho com o marca-texto e use o marcador para fixar um pino nele.
                  </Text>
                )}
                {markerItems.map((item) => (
                  item.kind === 'page' ? (
                    <View key={item.key} style={styles.tocItem}>
                      <Touchable style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => goToBookmark(item.bm)}>
                        <Ionicons name="bookmark" size={18} color={item.bm.color} style={{ width: 32 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tocItemTitle} numberOfLines={1}>{item.bm.title}</Text>
                          <Text style={styles.tocItemMeta} numberOfLines={1}>
                            Página • {chapters.find(c => c.id === item.bm.chapterId)?.title} • Folha {item.bm.page}
                          </Text>
                        </View>
                      </Touchable>
                      <Touchable
                        onPress={() => handleRemoveBookmark(item.bm.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Remover marcador"
                      >
                        <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                      </Touchable>
                    </View>
                  ) : (
                    <View key={item.key} style={styles.tocItem}>
                      <Touchable
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => {
                          setCurrentPageIndex(item.pin.pageIndex);
                          setShowSummary(false);
                        }}
                      >
                        <Ionicons name="bookmark" size={18} color={item.pin.color} style={{ width: 32 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tocItemTitle} numberOfLines={1}>{item.pin.title}</Text>
                          <Text style={styles.pinQuote} numberOfLines={2}>“{item.pin.text}”</Text>
                          <Text style={styles.tocItemMeta} numberOfLines={1}>
                            Trecho • {item.pin.chapterTitle} • Folha {item.pin.pageIndex + 1}
                          </Text>
                        </View>
                      </Touchable>
                      <Touchable
                        onPress={() => removeMarkById(item.pin.chapterId, item.pin.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Remover pino do trecho"
                      >
                        <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                      </Touchable>
                    </View>
                  )
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

      <PinExcerptSheet
        visible={pinFor !== null}
        excerpt={pinFor?.text || ''}
        label={`${currentChapter.title} • Folha ${currentPageNumber}`}
        onSave={savePin}
        onClose={() => setPinFor(null)}
      />
      <AiMenu
        visible={showAiMenu}
        onClose={() => setShowAiMenu(false)}
        onSelect={(id) => {
          setShowAiMenu(false);
          setAiPanel(id);
        }}
      />
      <AskBook
        visible={aiPanel === 'ask'}
        onClose={() => setAiPanel(null)}
        bookId={bookId}
        chapters={chapters}
        pages={pages}
        currentIndex={pageIndex}
        onGoToPage={goToPageIndex}
      />
      <CharacterMapModal
        visible={aiPanel === 'people'}
        onClose={() => setAiPanel(null)}
        bookId={bookId}
        chapters={chapters}
        pages={pages}
        currentIndex={pageIndex}
        onGoToPage={goToPageIndex}
      />
      <ExplainPassage
        visible={explainFor !== null}
        onClose={() => setExplainFor(null)}
        passage={explainFor}
        chapters={chapters}
        pages={pages}
        limitIndex={pageIndex}
        currentIndex={pageIndex}
      />
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
      <ReadingProgressModal
        visible={showProgress}
        onClose={() => setShowProgress(false)}
        book={book ? { ...book, totalPages } : null}
        position={currentPageNumber}
        entry={readingLog?.books[bookId]}
        forecast={book && readingLog ? bookForecast({ book: { ...book, totalPages }, entry: readingLog.books[bookId], log: readingLog, now: new Date() }) : null}
        onRegister={handleRegisterPage}
        onToggleFinished={handleToggleFinished}
        onToggleAbandoned={handleToggleAbandoned}
        onRate={() => { setShowProgress(false); setShowRating(true); }}
        stars={book ? personal?.ratings?.[bookWorkId(book)]?.stars || 0 : 0}
      />
      <RatingSheet
        visible={showRating}
        book={book}
        totalPages={totalPages}
        onClose={() => setShowRating(false)}
        onChanged={setPersonal}
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
  floatHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  column: {
    width: '100%',
    alignSelf: 'center',
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
    paddingHorizontal: 10,
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
  explainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginRight: 8,
  },
  explainText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    minWidth: 120,
    paddingVertical: 4,
  },
  footerProgress: {
    marginTop: 6,
    width: 110,
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
  pinQuote: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: 2,
  },
  highlightBar: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
    marginRight: 12,
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
