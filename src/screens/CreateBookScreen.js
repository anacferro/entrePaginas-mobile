import React, { useState, useEffect, useCallback } from 'react';
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
import { publicDomain } from '../services/publicDomain';
import { Section, Field, CoverPicker, CategoryPicker, ColorRow, fieldStyles } from '../components/FormBlocks';
import { storage } from '../services/storage';
import { dialog } from '../services/dialog';
import { importer } from '../services/importer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { COVER_COLORS, TITLE_COLORS, PAPER_COLORS, CATEGORIES } from '../theme/bookOptions';
import Touchable from '../components/Touchable';

const IMPORT_FORMATS = [
  { format: 'pdf', icon: 'document-text', name: 'PDF', description: 'Livro diagramado' },
  { format: 'epub', icon: 'tablet-portrait', name: 'EPUB', description: 'Livro digital' },
  { format: 'txt', icon: 'code-working', name: 'Texto Puro', description: '.txt, .markdown' },
  { format: 'json', icon: 'code-slash', name: 'Estrutura', description: 'JSON serializado' },
];

export default function CreateBookScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const initialTab = route?.params?.initialTab || 'create';
  const [activeTab, setActiveTab] = useState(initialTab === 'import' ? 'import' : 'create');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Literatura');
  const [coverColor, setCoverColor] = useState('#215C50');
  const [titleColor, setTitleColor] = useState('#FFFFFF');
  const [paperColor, setPaperColor] = useState('#F4EAE0');
  const [firstChapterTitle, setFirstChapterTitle] = useState('');
  const [firstChapterContent, setFirstChapterContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [searchKey, setSearchKey] = useState(0);
  const [tags, setTags] = useState([]);

  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [importedFile, setImportedFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const resetForm = useCallback(() => {
    setTitle('');
    setSubtitle('');
    setCategory('Literatura');
    setTags([]);
    setCoverColor('#215C50');
    setTitleColor('#FFFFFF');
    setPaperColor('#F4EAE0');
    setFirstChapterTitle('');
    setFirstChapterContent('');
    setImportedFile(null);
    setCoverImage(null);
    setSearchKey(key => key + 1);
  }, []);

  useEffect(() => navigation.addListener('blur', resetForm), [navigation, resetForm]);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === 'import' ? 'import' : 'create');
    }
  }, [route?.params?.initialTab]);

  const applyImported = useCallback((format, file) => {
    setSelectedFormat(format);
    setImportedFile(file);
    setTitle(file.title);
    setSubtitle(file.subtitle);
  }, []);

  const runImport = useCallback(async (format, task) => {
    try {
      setImporting(true);
      setSelectedFormat(format);
      const file = await task();
      if (file) applyImported(format, file);
    } catch (e) {
      dialog.alert('Falha na Importação', e.message || 'Não foi possível ler o arquivo selecionado.');
    } finally {
      setImporting(false);
    }
  }, [applyImported]);

  const handlePickFile = (format) => runImport(format, () => importer.pickAndImport(format));

  const handleDropFile = useCallback(
    (format, file) => runImport(format, () => importer.importDroppedFile(format, file)),
    [runImport]
  );

  const handleSelectGoogleBook = async (book) => {
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
      const fullText = await publicDomain.findFullText(book.title, book.authors);
      const full = fullText ? importer.fromText(fullText) : null;

      const newBook = await storage.addBook({
        title: book.title,
        subtitle: book.authors ? `Por ${book.authors}` : '',
        category: bookCategory,
        coverImage: book.thumbnail,
        totalPages: full ? full.pages : book.pageCount || undefined,
        isOwn: false,
        chapters: full
          ? full.chapters
          : [
              {
                id: `chap-${Date.now()}-1`,
                title: book.description ? 'Sinopse' : 'Capítulo 1',
                content: book.description || 'Livro adicionado pela busca. Esta obra não traz o texto; use o botão de comentários no leitor para fazer suas anotações.',
              },
            ],
      });

      resetForm();

      dialog.alert(
        'Livro adicionado!',
        full
          ? `"${newBook.title}" já está na sua estante com o texto completo (domínio público).`
          : `"${newBook.title}" já está na estante com a sinopse. A busca não traz o texto de livros com direitos autorais; no leitor você pode registrar seus comentários, sem alterar a obra.`,
        [{ text: 'Ver na Estante', onPress: () => navigation.navigate('Estante') }]
      );
    } catch {
      dialog.alert('Erro ao Salvar', 'Não foi possível adicionar o livro à estante.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBook = async () => {
    if (activeTab === 'import' && !importedFile) {
      dialog.alert('Nenhum Arquivo', 'Selecione um arquivo para importar antes de salvar.');
      return;
    }
    if (!title.trim()) {
      dialog.alert('Título Obrigatório', 'Por favor, informe o título da obra antes de salvar.');
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
        coverImage,
        totalPages: importedFile ? importedFile.pages : undefined,
        isOwn: activeTab === 'create',
        chapters: activeTab === 'import'
          ? importedFile.chapters
          : firstChapterContent.trim()
            ? [
                {
                  id: `chap-${Date.now()}-1`,
                  title: firstChapterTitle.trim() || 'Capítulo 1',
                  content: firstChapterContent,
                },
              ]
            : undefined,
      });

      resetForm();

      dialog.alert(
        'Obra Encadernada!',
        `"${newBook.title}" foi adicionado com sucesso à sua estante digital.`,
        [
          {
            text: 'Ver na Estante',
            onPress: () => navigation.navigate('Estante'),
          },
        ]
      );
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
            <View>
              <Text style={styles.pageTitle}>Criar Obra</Text>
              <Text style={styles.pageSubtitle}>Ateliê de encadernação e escrita artesanal</Text>
            </View>
            <View style={styles.headerIconBadge}>
              <Ionicons name="book-outline" size={20} color={colors.primary} />
            </View>
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
                color={activeTab === 'create' ? colors.onPrimary : colors.textSecondary}
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
                color={activeTab === 'import' ? colors.onPrimary : colors.textSecondary}
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

              <Section icon="document-text-outline" title="Folha de leitura" hint="Cor do fundo das páginas ao ler.">
                <ColorRow label="Cor da folha" options={PAPER_COLORS} value={paperColor} onChange={setPaperColor} outlined />
              </Section>

              <Section icon="reader-outline" title="Primeiro capítulo" hint="Opcional. Você pode escrever depois, direto no leitor.">
                <Field label="Título do capítulo">
                  <TextInput
                    style={styles.input}
                    placeholder="Capítulo 1"
                    placeholderTextColor={colors.textMuted}
                    value={firstChapterTitle}
                    onChangeText={setFirstChapterTitle}
                    returnKeyType="next"
                  />
                </Field>
                <Field label="Texto">
                  <TextInput
                    style={[styles.input, styles.writingBox]}
                    placeholder="Comece a escrever seu livro aqui."
                    placeholderTextColor={colors.textMuted}
                    value={firstChapterContent}
                    onChangeText={setFirstChapterContent}
                    multiline
                  />
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
                    fileName={importedFile && selectedFormat === item.format ? importedFile.name : null}
                    onPick={handlePickFile}
                    onDropFile={handleDropFile}
                  />
                ))}
              </View>

              {importedFile && !importedFile.warning && (
                <View style={styles.importSuccessBox}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 8 }} />
                  <Text style={styles.importSuccessText}>
                    &ldquo;{importedFile.title}&rdquo;: {importedFile.pages} {importedFile.pages === 1 ? 'página' : 'páginas'} e{' '}
                    {importedFile.chapters.length} {importedFile.chapters.length === 1 ? 'capítulo' : 'capítulos'} prontos para leitura.
                  </Text>
                </View>
              )}

              {importedFile?.warning && (
                <View style={[styles.importSuccessBox, styles.importWarningBox]}>
                  <Ionicons name="alert-circle" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                  <Text style={[styles.importSuccessText, { color: colors.warning }]}>
                    {importedFile.warning} O livro será criado com {importedFile.pages}{' '}
                    {importedFile.pages === 1 ? 'página' : 'páginas'} para você transcrever.
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomCard}>
            <Touchable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleSaveBook}
              disabled={saving}
            >
              <Ionicons name="library" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {saving ? 'Gravando Volume...' : 'Salvar Livro na Estante'}
              </Text>
            </Touchable>
          </View>
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
    marginBottom: 12,
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabsSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  previewCenterBox: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  formCard: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderWithMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  swatchTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchItem: {
    alignItems: 'center',
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.card,
    transform: [{ scale: 1.15 }],
  },
  colorName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  writingWrapper: {
    height: 180,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  writingInput: {
    height: '100%',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.primary,
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  extractBadge: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },
  formatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  formatCard: {
    width: '48%',
    backgroundColor: colors.surfaceWarm,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  formatCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  formatIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  formatName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  formatDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dropZone: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  cloudIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dropZoneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  dropZoneDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 17,
    marginBottom: 14,
  },
  autoDetectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  autoDetectText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
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
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
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
