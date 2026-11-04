import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GoogleBooksSearch from '../components/GoogleBooksSearch';
import AiSuggest from '../components/AiSuggest';
import BookCover from '../components/BookCover';
import { storage } from '../services/storage';
import { dialog } from '../services/dialog';
import { importer } from '../services/importer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { COVER_COLORS, TITLE_COLORS, PAPER_COLORS, CATEGORIES } from '../theme/bookOptions';

export default function CreateBookScreen({ navigation, route }) {
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
  const [suggestedPages, setSuggestedPages] = useState(null);
  const [tags, setTags] = useState([]);

  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [importedFile, setImportedFile] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === 'import' ? 'import' : 'create');
    }
  }, [route?.params?.initialTab]);

  const handleSelectFormat = (fmt) => {
    setSelectedFormat(fmt);
    if (importedFile) {
      setImportedFile(null);
      setTitle('');
      setSubtitle('');
    }
  };

  const handlePickFile = async () => {
    try {
      setImporting(true);
      const file = await importer.pickAndImport(selectedFormat);
      if (!file) return;
      setImportedFile(file);
      setTitle(file.title);
      setSubtitle(file.subtitle);
    } catch (e) {
      dialog.alert('Falha na Importação', e.message || 'Não foi possível ler o arquivo selecionado.');
    } finally {
      setImporting(false);
    }
  };

  const handleSelectGoogleBook = (book) => {
    setTitle(book.title);
    setSubtitle(book.authors ? `Por ${book.authors}` : '');
    setSuggestedPages(book.pageCount);
    if (book.category) {
      const match = CATEGORIES.find(c => book.category.toLowerCase().includes(c.toLowerCase().split(' ')[0]));
      setCategory(match || book.category);
    }
  };

  const handleApplySuggestion = (suggestion) => {
    if (suggestion.category) setCategory(suggestion.category);
    if (suggestion.tags) setTags(suggestion.tags);
    if (suggestion.synopsis && !subtitle.trim()) setSubtitle(suggestion.synopsis);
  };

  const suggestionText = importedFile
    ? importedFile.chapters.map(c => c.content).join('\n\n')
    : firstChapterContent;

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
        totalPages: importedFile ? importedFile.pages : suggestedPages || Math.floor(Math.random() * 60) + 20,
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

      setTitle('');
      setSubtitle('');
      setFirstChapterTitle('');
      setFirstChapterContent('');
      setImportedFile(null);

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceSoft} />
      <Header
        subtitle="Criar"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <KeyboardAvoidingView style={styles.scrollView} behavior="padding">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.navigate('Estante')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={17} color={colors.textSecondary} />
            <Text style={styles.backText}>Voltar para a Estante</Text>
          </TouchableOpacity>

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
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
              onPress={() => setActiveTab('create')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={activeTab === 'create' ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'create' && styles.tabButtonTextActive]}>
                Criar Livro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'import' && styles.tabButtonActive]}
              onPress={() => setActiveTab('import')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={16}
                color={activeTab === 'import' ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'import' && styles.tabButtonTextActive]}>
                Importar
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'create' ? (
            <View>
              <View style={styles.previewSection}>
                <Text style={styles.sectionLabel}>VISUALIZAÇÃO TÁTIL</Text>
                <View style={styles.previewCenterBox}>
                  <BookCover
                    title={title.trim() || 'Novo Livro'}
                    coverColor={coverColor}
                    titleColor={titleColor}
                    totalPages={384}
                    size="medium"
                  />
                </View>
              </View>

              <View style={styles.formCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="color-palette-outline" size={18} color={colors.secondary} />
                  <Text style={styles.cardHeaderTitle}>Revestimento & Detalhes</Text>
                </View>

                <Text style={styles.swatchTitle}>Cor da Capa</Text>
                <View style={styles.swatchesRow}>
                  {COVER_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.color}
                      style={styles.swatchItem}
                      onPress={() => setCoverColor(item.color)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.colorCircle,
                          { backgroundColor: item.color },
                          coverColor === item.color && styles.colorCircleSelected,
                        ]}
                      />
                      <Text style={styles.colorName}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.swatchTitle, { marginTop: 14 }]}>Cor do Título</Text>
                <View style={styles.swatchesRow}>
                  {TITLE_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.color}
                      style={styles.swatchItem}
                      onPress={() => setTitleColor(item.color)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.colorCircle,
                          { backgroundColor: item.color, borderWidth: 1, borderColor: colors.border },
                          titleColor === item.color && styles.colorCircleSelected,
                        ]}
                      />
                      <Text style={styles.colorName}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.swatchTitle, { marginTop: 14 }]}>Cor da Folha</Text>
                <View style={styles.swatchesRow}>
                  {PAPER_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.color}
                      style={styles.swatchItem}
                      onPress={() => setPaperColor(item.color)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.colorCircle,
                          { backgroundColor: item.color, borderWidth: 1, borderColor: colors.border },
                          paperColor === item.color && styles.colorCircleSelected,
                        ]}
                      />
                      <Text style={styles.colorName}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <GoogleBooksSearch onSelect={handleSelectGoogleBook} />

              <View style={styles.formCard}>
                <View style={styles.cardHeaderWithMeta}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                    <Text style={styles.cardHeaderTitle}>Ficha Catalográfica</Text>
                  </View>
                  <Text style={styles.metaLabel}>Metadados</Text>
                </View>

                <Text style={styles.fieldLabel}>Título da Obra *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="text-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nome do livro..."
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <Text style={styles.fieldLabel}>Subtítulo ou Resumo Curto</Text>
                <View style={[styles.inputWrapper, { height: 72, alignItems: 'flex-start', paddingTop: 8 }]}>
                  <TextInput
                    style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                    placeholder="Escreva aqui uma breve descrição ou notas editoriais..."
                    placeholderTextColor={colors.textMuted}
                    value={subtitle}
                    onChangeText={setSubtitle}
                    multiline
                  />
                </View>

                <Text style={styles.fieldLabel}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {(CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES]).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        category === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {tags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={styles.tagChip}
                        onPress={() => setTags(tags.filter(t => t !== tag))}
                        accessibilityLabel={`Remover etiqueta ${tag}`}
                      >
                        <Text style={styles.tagText}>{tag} ×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <AiSuggest title={title} text={suggestionText} onApply={handleApplySuggestion} />
              </View>

              <View style={styles.formCard}>
                <View style={styles.cardHeaderWithMeta}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="create-outline" size={18} color={colors.secondary} />
                    <Text style={styles.cardHeaderTitle}>Primeiro Capítulo</Text>
                  </View>
                  <Text style={styles.metaLabel}>Opcional</Text>
                </View>

                <Text style={styles.fieldLabel}>Título do Capítulo</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Capítulo 1"
                    placeholderTextColor={colors.textMuted}
                    value={firstChapterTitle}
                    onChangeText={setFirstChapterTitle}
                  />
                </View>

                <Text style={styles.fieldLabel}>Texto</Text>
                <View style={[styles.inputWrapper, styles.writingWrapper]}>
                  <TextInput
                    style={[styles.textInput, styles.writingInput]}
                    placeholder="Comece a escrever seu livro aqui. Você poderá continuar e criar novos capítulos pelo leitor."
                    placeholderTextColor={colors.textMuted}
                    value={firstChapterContent}
                    onChangeText={setFirstChapterContent}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.importHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-attach-outline" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
                  <Text style={styles.importSectionTitle}>Importar Conteúdo Existente</Text>
                </View>
                <Text style={styles.extractBadge}>Extração Automática</Text>
              </View>

              <View style={styles.formatsGrid}>
                <TouchableOpacity
                  style={[styles.formatCard, selectedFormat === 'pdf' && styles.formatCardActive]}
                  onPress={() => handleSelectFormat('pdf')}
                >
                  <View style={[styles.formatIconBox, { backgroundColor: '#FDECEA' }]}>
                    <Ionicons name="document-text" size={20} color="#D32F2F" />
                  </View>
                  <Text style={styles.formatName}>PDF</Text>
                  <Text style={styles.formatDesc}>Livro diagramado</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatCard, selectedFormat === 'epub' && styles.formatCardActive]}
                  onPress={() => handleSelectFormat('epub')}
                >
                  <View style={[styles.formatIconBox, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="tablet-portrait" size={20} color="#E65100" />
                  </View>
                  <Text style={styles.formatName}>EPUB</Text>
                  <Text style={styles.formatDesc}>Livro digital</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatCard, selectedFormat === 'txt' && styles.formatCardActive]}
                  onPress={() => handleSelectFormat('txt')}
                >
                  <View style={[styles.formatIconBox, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="code-working" size={20} color="#1976D2" />
                  </View>
                  <Text style={styles.formatName}>Texto Puro</Text>
                  <Text style={styles.formatDesc}>.txt, .markdown</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatCard, selectedFormat === 'json' && styles.formatCardActive]}
                  onPress={() => handleSelectFormat('json')}
                >
                  <View style={[styles.formatIconBox, { backgroundColor: '#EDE7F6' }]}>
                    <Ionicons name="code-slash" size={20} color="#512DA8" />
                  </View>
                  <Text style={styles.formatName}>Estrutura</Text>
                  <Text style={styles.formatDesc}>JSON serializado</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.dropZone}
                activeOpacity={0.8}
                onPress={handlePickFile}
                disabled={importing}
              >
                <View style={styles.cloudIconCircle}>
                  {importing ? (
                    <ActivityIndicator size="small" color={colors.secondary} />
                  ) : (
                    <Ionicons name="cloud-upload" size={32} color={colors.secondary} />
                  )}
                </View>
                <Text style={styles.dropZoneTitle}>
                  {importing
                    ? 'Lendo o arquivo...'
                    : importedFile
                      ? `Arquivo Selecionado: ${importedFile.name}`
                      : 'Toque para selecionar o arquivo'}
                </Text>
                <Text style={styles.dropZoneDesc}>
                  {importedFile
                    ? 'Toque novamente para escolher outro arquivo'
                    : 'PDF com texto, TXT, Markdown ou JSON, com reconhecimento de capítulos'}
                </Text>

                <View style={styles.autoDetectPill}>
                  <Ionicons name="bulb-outline" size={15} color={colors.accentGold} />
                  <Text style={styles.autoDetectText}>
                    Sumário e capítulos detectados automaticamente
                  </Text>
                </View>
              </TouchableOpacity>

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
            <View style={styles.syncStatusRow}>
              <View style={styles.statusIndicatorRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusTitle}>Armazenamento: Pronto</Text>
              </View>
              <Text style={styles.statusSubtitle}>No aparelho e na nuvem</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleSaveBook}
              disabled={saving}
            >
              <Ionicons name="library" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {saving ? 'Gravando Volume...' : 'Salvar Livro na Estante'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'serif',
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
    backgroundColor: '#EBE1D5',
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
    color: '#FFFFFF',
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
    fontFamily: 'serif',
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
    borderColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'serif',
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
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'serif',
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
    backgroundColor: '#F2EDE4',
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
    backgroundColor: '#FFFFFF',
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
    borderColor: '#C8E6C9',
    marginBottom: 16,
  },
  importWarningBox: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FFD8A8',
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
    color: '#FFFFFF',
  },
});
