import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import BookCover from '../components/BookCover';
import { storage } from '../services/storage';
import { colors } from '../theme/colors';

const COVER_COLORS = [
  { label: 'Clean', color: '#D9C8B5' },
  { label: 'Floresta', color: '#215C50' },
  { label: 'Musgo', color: '#4C6044' },
  { label: 'Vinho', color: '#7A2E26' },
  { label: 'Marinho', color: '#1F3347' },
  { label: 'Âmbar', color: '#9E6219' },
];

const TITLE_COLORS = [
  { label: 'Castanho', color: '#332722' },
  { label: 'Bege', color: '#EFE7DC' },
  { label: 'Céu', color: '#97B5D5' },
  { label: 'Branco', color: '#FFFFFF' },
];

const PAPER_COLORS = [
  { label: 'Comum', color: '#F4EAE0' },
  { label: 'Escuro', color: '#22201E' },
  { label: 'Mofo', color: '#DCD4C5' },
];

const CATEGORIES = ['Literatura', 'Memórias', 'Filosofia', 'Gastronomia', 'Arte & Design', 'Viagens'];

export default function CreateBookScreen({ navigation, route }) {
  const initialTab = route?.params?.initialTab || 'create';
  const [activeTab, setActiveTab] = useState(initialTab === 'import' ? 'import' : 'create');

  // Book Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Literatura');
  const [coverColor, setCoverColor] = useState('#215C50');
  const [titleColor, setTitleColor] = useState('#FFFFFF');
  const [paperColor, setPaperColor] = useState('#F4EAE0');
  const [saving, setSaving] = useState(false);

  // Import State
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [importedFile, setImportedFile] = useState(null);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === 'import' ? 'import' : 'create');
    }
  }, [route?.params?.initialTab]);

  const handleSelectFormat = (fmt) => {
    setSelectedFormat(fmt);
    const mockFiles = {
      pdf: { name: 'ensaio_filosofico.pdf', pages: 142, title: 'Ensaios sobre a Serenidade', subtitle: 'Importado de manuscrito PDF' },
      epub: { name: 'antologia_poetica.epub', pages: 88, title: 'Antologia Noturna', subtitle: 'Compilação em formato EPUB' },
      txt: { name: 'anotacoes_viagem.txt', pages: 45, title: 'Diário das Montanhas', subtitle: 'Notas de texto puro' },
      json: { name: 'backup_estante.json', pages: 210, title: 'Crônicas Restauradas', subtitle: 'Estrutura de dados serializada' },
    };

    const file = mockFiles[fmt];
    setImportedFile(file);
    setTitle(file.title);
    setSubtitle(file.subtitle);
  };

  const handleSaveBook = async () => {
    if (!title.trim()) {
      Alert.alert('Título Obrigatório', 'Por favor, informe o título da obra antes de salvar.');
      return;
    }

    try {
      setSaving(true);
      const newBook = await storage.addBook({
        title,
        subtitle,
        category,
        coverColor,
        titleColor,
        paperColor,
        totalPages: importedFile ? importedFile.pages : Math.floor(Math.random() * 60) + 20,
      });

      Alert.alert(
        'Obra Encadernada!',
        `"${newBook.title}" foi adicionado com sucesso à sua estante digital.`,
        [
          {
            text: 'Ver na Estante',
            onPress: () => {
              setTitle('');
              setSubtitle('');
              setImportedFile(null);
              navigation.navigate('Estante');
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Erro ao Salvar', 'Não foi possível gravar a obra no armazenamento local.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceSoft} />
      <Header
        subtitle="Criar"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Back Link */}
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.navigate('Estante')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={17} color={colors.textSecondary} />
          <Text style={styles.backText}>Voltar para a Estante</Text>
        </TouchableOpacity>

        {/* Header Title with decorative icon */}
        <View style={styles.pageHeaderRow}>
          <View>
            <Text style={styles.pageTitle}>Criar Obra</Text>
            <Text style={styles.pageSubtitle}>Ateliê de encadernação e escrita artesanal</Text>
          </View>
          <View style={styles.headerIconBadge}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
          </View>
        </View>

        {/* Segmented Switcher: Criar Livro | Importar */}
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
          /* TAB 1: CRIAR LIVRO MANUAL */
          <View>
            {/* Visualização Tátil (Live Preview) */}
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

            {/* Revestimento & Detalhes */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="color-palette-outline" size={18} color={colors.secondary} />
                <Text style={styles.cardHeaderTitle}>Revestimento & Detalhes</Text>
              </View>

              {/* Cor da Capa */}
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

              {/* Cor do Título */}
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

              {/* Cor da Folha */}
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

            {/* Ficha Catalográfica */}
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
                {CATEGORIES.map((cat) => (
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
            </View>
          </View>
        ) : (
          /* TAB 2: IMPORTAR CONTEÚDO */
          <View>
            <View style={styles.importHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document-attach-outline" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.importSectionTitle}>Importar Conteúdo Existente</Text>
              </View>
              <Text style={styles.extractBadge}>Extração Automática</Text>
            </View>

            {/* 4 Format Options (2x2 Grid) */}
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
                <Text style={styles.formatDesc}>E-reader padrão</Text>
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

            {/* Upload Area */}
            <TouchableOpacity
              style={styles.dropZone}
              activeOpacity={0.8}
              onPress={() => handleSelectFormat(selectedFormat)}
            >
              <View style={styles.cloudIconCircle}>
                <Ionicons name="cloud-upload" size={32} color={colors.secondary} />
              </View>
              <Text style={styles.dropZoneTitle}>
                {importedFile ? `Arquivo Selecionado: ${importedFile.name}` : 'Toque para selecionar ou arraste o arquivo'}
              </Text>
              <Text style={styles.dropZoneDesc}>
                Suporta PDF, EPUB, TXT e Markdown com reconhecimento de capítulos
              </Text>

              <View style={styles.autoDetectPill}>
                <Ionicons name="bulb-outline" size={15} color={colors.accentGold} />
                <Text style={styles.autoDetectText}>
                  Sumário e capítulos detectados automaticamente
                </Text>
              </View>
            </TouchableOpacity>

            {importedFile && (
              <View style={styles.importSuccessBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={styles.importSuccessText}>
                  Extraídos: {importedFile.pages} páginas e 2 capítulos prontos para leitura.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom Persistence Status & Action */}
        <View style={styles.bottomCard}>
          <View style={styles.syncStatusRow}>
            <View style={styles.statusIndicatorRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusTitle}>Armazenamento Local: Pronto</Text>
            </View>
            <Text style={styles.statusSubtitle}>Auto-salvo agora</Text>
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
