import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GoogleBooksSearch from '../components/GoogleBooksSearch';
import FormatCard from '../components/FormatCard';
import ConvertBookFlow from '../components/ConvertBookFlow';
import { fetchFullTextInBackground } from '../services/googleImport';
import { bookFonts } from '../services/bookFonts';
import { Section, Field, CoverPicker, CategoryPicker, ColorRow, FontPicker, fieldStyles } from '../components/FormBlocks';
import { storage } from '../services/storage';
import { dialog } from '../services/dialog';
import { importer } from '../services/importer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { COVER_COLORS, TITLE_COLORS, PAPER_COLORS, CATEGORIES, DEFAULT_COVER_COLOR, DEFAULT_TITLE_COLOR, DEFAULT_PAPER_COLOR } from '../theme/bookOptions';
import Touchable from '../components/Touchable';
import { useToast } from '../components/Toast';
import { fonts } from '../theme/tokens';

const IMPORT_FORMATS = [
  { format: 'pdf', icon: 'document-text', name: 'PDF', description: 'Livro diagramado' },
  { format: 'epub', icon: 'tablet-portrait', name: 'EPUB', description: 'Livro digital' },
  { format: 'txt', icon: 'code-working', name: 'Texto Puro', description: '.txt, .markdown' },
  { format: 'json', icon: 'code-slash', name: 'Estrutura', description: 'JSON serializado' },
];

export default function CreateBookScreen({ navigation, route }) {
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const initialTab = route?.params?.initialTab || 'create';
  const [activeTab, setActiveTab] = useState(initialTab === 'import' ? 'import' : 'create');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Literatura');
  const [coverColor, setCoverColor] = useState(DEFAULT_COVER_COLOR);
  const [titleColor, setTitleColor] = useState(DEFAULT_TITLE_COLOR);
  const [paperColor, setPaperColor] = useState(DEFAULT_PAPER_COLOR);
  const [fontFamily, setFontFamily] = useState('serif');
  const [saving, setSaving] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [searchKey, setSearchKey] = useState(0);
  const adding = useRef(new Set());
  const [tags, setTags] = useState([]);

  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [importing, setImporting] = useState(false);
  const [converting, setConverting] = useState(false);

  const resetForm = useCallback(() => {
    setTitle('');
    setSubtitle('');
    setCategory('Literatura');
    setTags([]);
    setCoverColor(DEFAULT_COVER_COLOR);
    setTitleColor(DEFAULT_TITLE_COLOR);
    setPaperColor(DEFAULT_PAPER_COLOR);
    setFontFamily('serif');
    setCoverImage(null);
    setSearchKey(key => key + 1);
  }, []);

  useEffect(() => navigation.addListener('blur', resetForm), [navigation, resetForm]);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === 'import' ? 'import' : 'create');
    }
  }, [route?.params?.initialTab]);

  const saveImported = useCallback(async (file) => {
    const bookTitle = (file.title || '').trim() || file.name || 'Livro importado';
    const newBook = await storage.addBook({
      title: bookTitle,
      subtitle: file.subtitle,
      category: 'Literatura',
      coverColor: DEFAULT_COVER_COLOR,
      titleColor: DEFAULT_TITLE_COLOR,
      paperColor: DEFAULT_PAPER_COLOR,
      fontFamily: file.fontHint || 'serif',
      fontFallback: file.fontHint || null,
      totalPages: file.pages,
      normalization: file.normalization || null,
      coverImage: file.coverImage || null,
      isOwn: false,
      chapters: file.chapters,
    });
    const savedFont = file.font ? await bookFonts.save(newBook.id, file.font).catch(() => null) : null;
    if (savedFont) await storage.updateBook(newBook.id, { ...savedFont, fontFamily: 'original' });
    resetForm();
    toast.show(`"${newBook.title}" foi adicionado à sua estante.`);
    navigation.navigate('Estante');
    if (file.warning) {
      dialog.alert('Livro adicionado', `${file.warning} O livro foi criado com ${file.pages} ${file.pages === 1 ? 'página' : 'páginas'} para você transcrever.`);
    }
  }, [navigation, resetForm, toast]);

  const runImport = useCallback(async (format, task) => {
    try {
      setImporting(true);
      setSelectedFormat(format);
      const file = await task();
      if (file) await saveImported(file);
    } catch (e) {
      dialog.alert('Falha na Importação', e.message || 'Não foi possível ler o arquivo selecionado.');
    } finally {
      setImporting(false);
    }
  }, [saveImported]);

  const handlePickFile = (format) => runImport(format, () => importer.pickAndImport(format));

  const handleDropFile = useCallback(
    (format, file) => runImport(format, () => importer.importDroppedFile(format, file)),
    [runImport]
  );

  const handleSelectGoogleBook = async (book) => {
    if (adding.current.has(book.title)) return;
    adding.current.add(book.title);
    try {
      await addGoogleBook(book);
    } finally {
      adding.current.delete(book.title);
    }
  };

  const addGoogleBook = async (book) => {
    const normalize = (text) =>
      (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

    const [shelf, chest] = await Promise.all([
      storage.getBooks(0).catch(() => []),
      storage.getChestBooks(0).catch(() => []),
    ]);
    const existing = [...shelf, ...chest].find(b => normalize(b.title) === normalize(book.title));
    if (existing) {
      dialog.alert(
        'Livro já cadastrado',
        existing.status === 'bau'
          ? `"${existing.title}" já está no seu Baú. Restaure-o de lá se quiser lê-lo.`
          : `"${existing.title}" já está na sua estante.`
      );
      return;
    }

    const match = book.category
      ? CATEGORIES.find(c => book.category.toLowerCase().includes(c.toLowerCase().split(' ')[0]))
      : null;
    const bookCategory = match || (book.category && book.category.length <= 30 ? book.category : 'Literatura');

    try {
      setSaving(true);
      const newBook = await storage.addBook({
        title: book.title,
        subtitle: book.authors ? `Por ${book.authors}` : '',
        category: bookCategory,
        coverImage: book.thumbnail,
        paperColor: '#EFE2C4',
        fontFamily: 'serif',
        totalPages: book.pageCount || undefined,
        isOwn: false,
        textPending: book.gutenbergId || null,
        chapters: [
          {
            id: `chap-${Date.now()}-1`,
            title: book.description ? 'Sinopse' : 'Capítulo 1',
            content: book.description || 'Livro adicionado pela busca. Esta obra não traz o texto; use o botão de comentários no leitor para fazer suas anotações.',
          },
        ],
      });

      resetForm();
      navigation.navigate('Estante');

      fetchFullTextInBackground(newBook.id, newBook.title, book.authors, book.gutenbergId).then((result) => {
        if (result === 'failed') toast.show('O texto completo ainda não pôde ser baixado. O livro continua na estante e o app tenta de novo.', 'info');
      });
    } catch {
      dialog.alert('Erro ao Salvar', 'Não foi possível adicionar o livro à estante.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBook = async () => {
    if (!title.trim()) {
      dialog.alert('Título Obrigatório', 'Por favor, informe o título da obra antes de criar.');
      return;
    }

    try {
      setSaving(true);
      const newBook = await storage.addBook({
        title,
        subtitle,
        category,
        tags,
        coverColor,
        titleColor,
        paperColor,
        fontFamily,
        coverImage,
        isOwn: true,
      });

      resetForm();
      navigation.navigate('Reader', { bookId: newBook.id, bookTitle: newBook.title });
    } catch {
      dialog.alert('Erro ao Salvar', 'Não foi possível gravar a obra no armazenamento local.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.surfaceSoft} />
      <Header
        subtitle="Criar"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <KeyboardAvoidingView style={styles.scrollView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Touchable
            style={styles.backRow}
            onPress={() => navigation.navigate('Estante')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={17} color={colors.textSecondary} />
            <Text style={styles.backText}>Voltar para a Estante</Text>
          </Touchable>

          <View style={styles.pageHeaderRow}>
            <Text style={styles.pageTitle}>Criar Obra</Text>
          </View>

          <View style={styles.tabsSwitcher}>
            <Touchable
              style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
              onPress={() => setActiveTab('create')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={activeTab === 'create' ? colors.onPrimary : colors.text}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'create' && styles.tabButtonTextActive]}>
                Criar Livro
              </Text>
            </Touchable>

            <Touchable
              style={[styles.tabButton, activeTab === 'import' && styles.tabButtonActive]}
              onPress={() => setActiveTab('import')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={16}
                color={activeTab === 'import' ? colors.onPrimary : colors.text}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'import' && styles.tabButtonTextActive]}>
                Importar
              </Text>
            </Touchable>
          </View>

          {activeTab === 'create' ? (
            <View>
              <GoogleBooksSearch key={searchKey} onSelect={handleSelectGoogleBook} />

              <Section icon="create-outline" title="Informações">
                <Field label="Título da obra *">
                  <TextInput
                    style={styles.input}
                    placeholder="Nome do livro"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                    returnKeyType="next"
                    accessibilityLabel="Título da obra"
                  />
                </Field>

                <Field label="Subtítulo ou resumo curto">
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Breve descrição ou notas"
                    placeholderTextColor={colors.textMuted}
                    value={subtitle}
                    onChangeText={setSubtitle}
                    multiline
                    blurOnSubmit
                    accessibilityLabel="Subtítulo"
                  />
                </Field>

                <Field label="Categoria">
                  <CategoryPicker value={category} onChange={setCategory} />
                </Field>
              </Section>

              <Section icon="image-outline" title="Capa" hint="Use uma foto sua ou escolha as cores da capa.">
                <CoverPicker
                  title={title}
                  coverColor={coverColor}
                  titleColor={titleColor}
                  coverImage={coverImage}
                  onChange={setCoverImage}
                />
                {!coverImage && (
                  <>
                    <ColorRow label="Cor da capa" options={COVER_COLORS} value={coverColor} onChange={setCoverColor} />
                    <ColorRow label="Cor do título" options={TITLE_COLORS} value={titleColor} onChange={setTitleColor} outlined />
                  </>
                )}
              </Section>

              <Section icon="document-text-outline" title="Folha de leitura" hint="Cor e letra usadas nas páginas ao ler.">
                <ColorRow label="Cor da folha" options={PAPER_COLORS} value={paperColor} onChange={setPaperColor} outlined />
                <Field label="Tipo de letra">
                  <FontPicker value={fontFamily} onChange={setFontFamily} />
                </Field>
              </Section>
            </View>
          ) : (
            <View>
              <View style={styles.importHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-attach-outline" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
                  <Text style={styles.importSectionTitle}>Importar Conteúdo Existente</Text>
                </View>
              </View>

              <Touchable style={styles.convertCard} onPress={() => setConverting(true)} accessibilityLabel="Converter arquivo em livro">
                <View style={styles.convertIcon}>
                  <Ionicons name="sparkles-outline" size={24} color={colors.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.convertTitle}>Converter arquivo em livro</Text>
                  <Text style={styles.convertText}>Transforme seus documentos em livros digitais preparados para leitura no aplicativo.</Text>
                  <Text style={styles.convertFormats}>DOCX, ODT, RTF, TXT, MD, HTML, XML, PDF</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Touchable>

              <View style={styles.formatsGrid}>
                {IMPORT_FORMATS.map((item) => (
                  <FormatCard
                    key={item.format}
                    format={item.format}
                    icon={item.icon}
                    name={item.name}
                    description={item.description}
                    tone={colors.formats[item.format]}
                    loading={importing && selectedFormat === item.format}
                    onPick={handlePickFile}
                    onDropFile={handleDropFile}
                  />
                ))}
              </View>
            </View>
          )}

          <ConvertBookFlow visible={converting} onClose={() => setConverting(false)} onImport={saveImported} />

          {activeTab === 'create' && (
            <View style={styles.bottomCard}>
              <Touchable
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleSaveBook}
                disabled={saving}
              >
                <Ionicons name="create" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Criando o livro...' : 'Criar e começar a escrever'}
                </Text>
              </Touchable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  input: fieldStyles(colors).input,
  textarea: fieldStyles(colors).textarea,
  writingBox: {
    ...fieldStyles(colors).textarea,
    height: 220,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    marginBottom: 4,
  },
  backText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 6,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
  },
  tabsSwitcher: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tabButtonTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  importHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  importSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
  },
  convertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    marginBottom: 14,
  },
  convertIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  convertText: { fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 2 },
  convertFormats: { fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: 6 },
  formatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  importSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.successBorder,
    marginBottom: 16,
  },
  importWarningBox: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  importSuccessText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  bottomCard: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
