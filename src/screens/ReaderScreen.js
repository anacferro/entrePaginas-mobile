import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { storage } from '../services/storage';
import { colors } from '../theme/colors';

export default function ReaderScreen({ route, navigation }) {
  // Navigation parameter passing: bookId, bookTitle
  const { bookId, bookTitle } = route.params || {};

  const [book, setBook] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showTypography, setShowTypography] = useState(false);
  const [themeMode, setThemeMode] = useState('light'); // 'light' | 'dark'

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
  const currentPageNumber = Math.min(38 + currentPageIndex * 12, totalPages);

  const isDark = themeMode === 'dark';
  const readerBg = isDark ? colors.reader.dark.background : colors.reader.light.background;
  const readerTextColor = isDark ? colors.reader.dark.text : colors.reader.light.text;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: readerBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surfaceSoft} />
      
      {/* App Header */}
      <Header
        subtitle="Leitura"
        onProfilePress={() => navigation.navigate('Perfil')}
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
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowSummary(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="list" size={20} color={readerTextColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowTypography(!showTypography)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="text" size={20} color={readerTextColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setIsBookmarked(!isBookmarked);
              Alert.alert(
                !isBookmarked ? 'Marcador Salvo' : 'Marcador Removido',
                !isBookmarked ? `Página ${currentPageNumber} adicionada aos favoritos.` : 'Marcador removido.'
              );
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isBookmarked ? colors.secondary : readerTextColor}
            />
          </TouchableOpacity>
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
      <ScrollView
        style={styles.readerScroll}
        contentContainerStyle={styles.readerContentContainer}
      >
        <Text
          style={[
            styles.bookParagraphs,
            {
              color: readerTextColor,
              fontSize: fontSize,
              lineHeight: fontSize * 1.68,
            },
          ]}
        >
          {currentChapter.content}
        </Text>

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
            style={[styles.pageNavBtn, currentPageIndex >= chapters.length - 1 && { opacity: 0.3 }]}
            disabled={currentPageIndex >= chapters.length - 1}
            onPress={() => setCurrentPageIndex(Math.min(chapters.length - 1, currentPageIndex + 1))}
          >
            <Text style={[styles.pageNavText, { color: readerTextColor }]}>Próxima</Text>
            <Ionicons name="chevron-forward" size={20} color={readerTextColor} />
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                    <Text style={styles.tocItemMeta}>Folha {38 + idx * 12}</Text>
                  </View>
                  {currentPageIndex === idx && (
                    <Ionicons name="book" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    gap: 12,
  },
  iconBtn: {
    padding: 4,
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
});
