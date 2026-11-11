import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Platform, ActivityIndicator, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Touchable from './Touchable';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import { importer } from '../services/importer';
import { exporter } from '../services/exporter';
import { ai } from '../services/ai';
import { dialog } from '../services/dialog';
import { formatNumber } from '../services/readingStats';
import {
  inspect, advise, convert, toImported, ConvertError, KIND_LABELS, FORMATS, EPUB_DEFAULTS, PDF_DEFAULTS,
} from '../services/converter/index';

const ACCEPTED_CHIPS = ['DOCX', 'DOC', 'ODT', 'RTF', 'TXT', 'MD', 'HTML', 'XML', 'PDF'];

const STAGES = ['Lendo o arquivo', 'Extraindo a estrutura', 'Medindo o documento', 'Pedindo uma segunda opinião à IA'];

const COMPARE = [
  ['Ajustar fonte, margens e espaçamento', 'Sim', 'Não', '—'],
  ['Mantém a aparência do original', 'Em parte', 'Sim', '—'],
  ['Tabelas largas e imagens posicionadas', 'Podem perder a posição', 'Preservadas', 'Só o texto'],
  ['Navegação por capítulos', 'Sim', 'Sumário', 'Sim'],
  ['Melhor para', 'Leitura de texto', 'Trabalhos e layouts', 'Integração técnica'],
];

const FONT_SIZES = [['small', 'Pequena'], ['medium', 'Média'], ['large', 'Grande'], ['xlarge', 'Muito grande']];
const LINE_HEIGHTS = [[1.35, 'Compacto'], [1.55, 'Normal'], [1.8, 'Amplo']];
const MARGINS = [['narrow', 'Estreita'], ['medium', 'Média'], ['wide', 'Larga']];
const PDF_SIZES = [['A4', 'A4'], ['A5', 'A5'], ['Letter', 'Carta']];
const PDF_FONT = [[10, '10'], [11, '11'], [12, '12'], [14, '14']];

function Chip({ label, active, onPress, styles }) {
  return (
    <Touchable style={[styles.chip, active && styles.chipOn]} onPress={onPress} accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Touchable>
  );
}

function Option({ label, children, styles }) {
  return (
    <View style={styles.option}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Toggle({ label, hint, value, onChange, styles, colors }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel={label} />
    </View>
  );
}

function sizeKb(bytes) {
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(kb)} KB`;
}

export default function ConvertBookFlow({ visible, onClose, onImport }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dropRef = useRef(null);
  const busy = useRef(false);
  const lastAdded = useRef(null);
  const [step, setStep] = useState('select');
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [useAi, setUseAi] = useState(ai.isAvailable);
  const [dragging, setDragging] = useState(false);
  const [info, setInfo] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [format, setFormat] = useState('epub');
  const [showCompare, setShowCompare] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [epub, setEpub] = useState({ ...EPUB_DEFAULTS });
  const [pdf, setPdf] = useState({ ...PDF_DEFAULTS });
  const [result, setResult] = useState(null);
  const [imported, setImported] = useState(null);
  const [saveCopy, setSaveCopy] = useState(false);
  const [working, setWorking] = useState(false);

  const reset = useCallback(() => {
    setStep('select');
    setError(null);
    setInfo(null);
    setRecommendation(null);
    setResult(null);
    setImported(null);
    setSaveCopy(false);
    setShowCompare(false);
    setShowAdvanced(false);
    setEpub({ ...EPUB_DEFAULTS });
    setPdf({ ...PDF_DEFAULTS });
    setWorking(false);
    busy.current = false;
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const analyze = useCallback(async (file) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setStep('analyzing');
    const tick = (n) => {
      setStage(n);
      return new Promise((resolve) => setTimeout(resolve, 40));
    };
    try {
      await tick(0);
      await tick(1);
      const inspection = inspect(file);
      await tick(2);
      let recommended = inspection.recommendation;
      if (useAi && ai.isAvailable) {
        await tick(3);
        recommended = await advise(inspection, (system, payload) => ai.adviseConversion(system, payload));
      }
      setInfo(inspection);
      setRecommendation(recommended);
      setFormat(recommended.format);
      setTitle(inspection.doc.title || '');
      setAuthor(inspection.doc.author || '');
      setStep('recommend');
    } catch (e) {
      setError(e instanceof ConvertError ? e.message : 'Não foi possível analisar o arquivo.');
      setStep('select');
    } finally {
      busy.current = false;
    }
  }, [useAi]);

  const pick = useCallback(async () => {
    if (busy.current) return;
    try {
      const file = await importer.pickDocument();
      if (file) await analyze(file);
    } catch (e) {
      setError(e.message || 'Não foi possível ler o arquivo.');
    }
  }, [analyze]);

  useEffect(() => {
    const node = dropRef.current;
    if (!visible || Platform.OS !== 'web' || !node?.addEventListener) return undefined;
    const over = (event) => {
      event.preventDefault();
      setDragging(true);
    };
    const leave = () => setDragging(false);
    const drop = async (event) => {
      event.preventDefault();
      setDragging(false);
      const dropped = event.dataTransfer?.files?.[0];
      if (!dropped || busy.current || step !== 'select') return;
      try {
        await analyze(await importer.readDroppedDocument(dropped));
      } catch (e) {
        setError(e.message || 'Não foi possível ler o arquivo.');
      }
    };
    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
  }, [visible, step, analyze]);

  const options = () => {
    const base = format === 'epub' ? epub : format === 'pdf' ? pdf : {};
    return { ...base, title: title.trim() || undefined, author: author.trim() || undefined };
  };

  const runConversion = () => {
    if (working) return;
    setWorking(true);
    setStep('converting');
    setTimeout(() => {
      try {
        const doc = { ...info.doc, title: title.trim() || info.doc.title, author: author.trim() };
        const out = convert(doc, format, options());
        setResult(out);
        setImported(toImported(doc, out, { title: doc.title, author: doc.author }));
        setStep('preview');
      } catch (e) {
        setError(e instanceof ConvertError ? e.message : 'A conversão falhou. Tente outro formato.');
        setStep('options');
      } finally {
        setWorking(false);
      }
    }, 60);
  };

  const confirm = async () => {
    if (working || !imported) return;
    const key = `${info.fingerprint}|${format}`;
    if (lastAdded.current === key) {
      dialog.alert('Já adicionado', 'Este arquivo já foi convertido e adicionado nesta sessão.');
      return;
    }
    setWorking(true);
    try {
      lastAdded.current = key;
      if (saveCopy) {
        try {
          await exporter.shareFile(result.bytes, result.fileName, result.mime);
        } catch (e) {
          dialog.alert('Cópia não salva', e.message || 'Não foi possível salvar a cópia do arquivo convertido.');
        }
      }
      await onImport(imported);
      onClose();
    } catch (e) {
      lastAdded.current = null;
      setError(e.message || 'Não foi possível adicionar o livro.');
    } finally {
      setWorking(false);
    }
  };

  const cancel = () => {
    if (working) return;
    onClose();
  };

  const stats = info?.stats;
  const traits = stats
    ? [
        `${stats.pagesEstimated ? 'cerca de ' : ''}${formatNumber(stats.pages)} ${stats.pages === 1 ? 'página' : 'páginas'}${stats.pagesEstimated ? ' (estimado)' : ''}`,
        `aproximadamente ${formatNumber(stats.words)} palavras e ${formatNumber(stats.chars)} caracteres`,
        stats.chapters ? `${stats.chapters} ${stats.chapters === 1 ? 'capítulo identificado' : 'capítulos identificados'}` : 'nenhum capítulo identificado (será dividido em seções)',
        `${stats.headings} ${stats.headings === 1 ? 'título' : 'títulos e subtítulos'}`,
        stats.images ? `${stats.images} ${stats.images === 1 ? 'imagem' : 'imagens'}` : 'sem imagens',
        stats.tables ? `${stats.tables} ${stats.tables === 1 ? 'tabela' : 'tabelas'}${stats.wideTables ? ` (${stats.wideTables} larga${stats.wideTables === 1 ? '' : 's'})` : ''}` : 'sem tabelas',
        stats.charts ? `${stats.charts} gráfico${stats.charts === 1 ? '' : 's'}` : null,
        stats.footnotes ? `${stats.footnotes} nota${stats.footnotes === 1 ? '' : 's'} de rodapé` : null,
        stats.hasToc ? 'sumário existente' : null,
        stats.headerFooter ? 'cabeçalhos e rodapés' : null,
        stats.fonts?.length ? `fontes: ${stats.fonts.slice(0, 3).join(', ')}` : null,
      ].filter(Boolean)
    : [];

  const renderSelect = () => (
    <View>
      <Text style={styles.lead}>Transforme seus documentos em uma experiência de leitura.</Text>
      <View ref={dropRef} style={[styles.drop, dragging && styles.dropOn]}>
        <Ionicons name="document-attach-outline" size={34} color={colors.primary} />
        <Text style={styles.dropTitle}>{Platform.OS === 'web' ? 'Arraste um arquivo para cá' : 'Escolha um documento'}</Text>
        <Text style={styles.hint}>Ou toque para escolher no dispositivo. Limite de 30 MB.</Text>
        <Touchable style={styles.primaryBtn} onPress={pick} accessibilityLabel="Escolher arquivo para converter">
          <Ionicons name="folder-open-outline" size={18} color={colors.onPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.primaryText}>Escolher arquivo</Text>
        </Touchable>
      </View>
      {error ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Text style={styles.label}>Formatos aceitos</Text>
      <View style={styles.chips}>
        {ACCEPTED_CHIPS.map((c) => (
          <View key={c} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>
        ))}
      </View>
      <Text style={styles.hint}>O app confere o conteúdo real do arquivo, não só a extensão. DOC antigo (Word 97-2003) precisa ser salvo como DOCX, ODT ou RTF antes.</Text>
      {ai.isAvailable ? (
        <Toggle
          styles={styles}
          colors={colors}
          label="Pedir uma segunda opinião à IA"
          hint="Envia só números e títulos de seção para sugerir o formato. O texto do livro nunca é enviado."
          value={useAi}
          onChange={setUseAi}
        />
      ) : null}
    </View>
  );

  const renderAnalyzing = () => (
    <View style={styles.centerBox}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.sectionTitle}>Analisando o documento</Text>
      {STAGES.slice(0, useAi && ai.isAvailable ? 4 : 3).map((label, i) => (
        <View key={label} style={styles.stageRow}>
          <Ionicons name={i < stage ? 'checkmark-circle' : i === stage ? 'ellipse' : 'ellipse-outline'} size={16} color={i <= stage ? colors.primary : colors.textMuted} />
          <Text style={[styles.stageText, i === stage && styles.stageNow]}>{label}</Text>
        </View>
      ))}
    </View>
  );

  const formatCard = (key) => {
    const meta = FORMATS[key];
    const tone = colors.formats[key] || colors.formats.json;
    const recommended = recommendation?.format === key;
    const selected = format === key;
    return (
      <Touchable
        key={key}
        style={[styles.formatCard, selected && styles.formatCardOn]}
        onPress={() => setFormat(key)}
        accessibilityState={{ selected }}
        accessibilityLabel={`Formato ${meta.name}${recommended ? ', recomendado' : ''}`}
      >
        <View style={[styles.iconBox, { backgroundColor: tone.bg }]}>
          <Ionicons name={meta.icon} size={20} color={tone.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.formatName}>{meta.name}</Text>
          <Text style={styles.hint}>{meta.tagline}</Text>
        </View>
        {recommended ? <View style={styles.badge}><Text style={styles.badgeText}>Recomendado</Text></View> : null}
        <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.textMuted} />
      </Touchable>
    );
  };

  const renderRecommend = () => (
    <View>
      <Text style={styles.sectionTitle}>Análise concluída</Text>
      <View style={styles.fileRow}>
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.fileName} numberOfLines={2}>{stats.fileName}</Text>
          <Text style={styles.hint}>{KIND_LABELS[stats.kind]} · {sizeKb(stats.size)}</Text>
        </View>
      </View>
      <Text style={styles.label}>Características identificadas</Text>
      {traits.map((t) => (
        <Text key={t} style={styles.bullet}>{`•  ${t}`}</Text>
      ))}
      {[...(stats.problems || []), ...(recommendation.aiProblems || [])].length ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>Pontos de atenção</Text>
          {[...new Set([...(stats.problems || []), ...(recommendation.aiProblems || [])])].map((p) => (
            <Text key={p} style={styles.warnText}>{`•  ${p}`}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.recBox}>
        <Text style={styles.recTitle}>Formato recomendado: {FORMATS[recommendation.format].name}</Text>
        <Text style={styles.recText}>{recommendation.reason}</Text>
        <Text style={styles.hint}>{recommendation.alternativeNote}</Text>
        <Text style={styles.hint}>
          {recommendation.source === 'ia' ? 'Análise por regras com revisão da IA. ' : 'Análise por regras sobre os números do documento. '}
          Confiança {recommendation.confidence}.
        </Text>
        {recommendation.aiNote ? <Text style={styles.hint}>{recommendation.aiNote}</Text> : null}
      </View>

      <Text style={styles.label}>Escolha o formato</Text>
      {['epub', 'pdf', 'json'].map(formatCard)}

      <Touchable style={styles.linkBtn} onPress={() => setShowCompare((v) => !v)} accessibilityLabel="Ver as diferenças entre os formatos">
        <Text style={styles.linkText}>{showCompare ? 'Ocultar diferenças' : 'Ver as diferenças entre os formatos'}</Text>
      </Touchable>
      {showCompare ? (
        <View style={styles.compare}>
          <View style={styles.compareRow}>
            <Text style={[styles.compareCell, styles.compareHead, { flex: 2 }]} />
            {['EPUB', 'PDF', 'JSON'].map((h) => <Text key={h} style={[styles.compareCell, styles.compareHead]}>{h}</Text>)}
          </View>
          {COMPARE.map((row) => (
            <View key={row[0]} style={styles.compareRow}>
              <Text style={[styles.compareCell, { flex: 2, fontWeight: '700' }]}>{row[0]}</Text>
              {row.slice(1).map((cell, i) => <Text key={i} style={styles.compareCell}>{cell}</Text>)}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderOptions = () => (
    <View>
      <Text style={styles.sectionTitle}>Ajustes de {FORMATS[format].name}</Text>
      <Text style={styles.hint}>Os ajustes mudam só a apresentação. O conteúdo do documento não é alterado.</Text>
      <Text style={styles.label}>Título</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Título do livro" placeholderTextColor={colors.textMuted} accessibilityLabel="Título do livro" />
      <Text style={styles.label}>Autor (opcional)</Text>
      <TextInput style={styles.input} value={author} onChangeText={setAuthor} placeholder="Nome do autor" placeholderTextColor={colors.textMuted} accessibilityLabel="Autor do livro" />

      {format === 'epub' ? (
        <View>
          <Option styles={styles} label="Tamanho da letra">
            {FONT_SIZES.map(([k, l]) => <Chip key={k} styles={styles} label={l} active={epub.fontSize === k} onPress={() => setEpub({ ...epub, fontSize: k })} />)}
          </Option>
          <Toggle styles={styles} colors={colors} label="Incluir sumário" value={epub.includeToc} onChange={(v) => setEpub({ ...epub, includeToc: v })} />
          <Toggle styles={styles} colors={colors} label="Incluir imagens" hint={info.stats.images ? null : 'O documento não tem imagens.'} value={epub.includeImages} onChange={(v) => setEpub({ ...epub, includeImages: v })} />
          <Touchable style={styles.linkBtn} onPress={() => setShowAdvanced((v) => !v)}>
            <Text style={styles.linkText}>{showAdvanced ? 'Ocultar ajustes avançados' : 'Ajustes avançados'}</Text>
          </Touchable>
          {showAdvanced ? (
            <View>
              <Option styles={styles} label="Fonte">
                <Chip styles={styles} label="Com serifa" active={epub.fontFamily === 'serif'} onPress={() => setEpub({ ...epub, fontFamily: 'serif' })} />
                <Chip styles={styles} label="Sem serifa" active={epub.fontFamily === 'sans'} onPress={() => setEpub({ ...epub, fontFamily: 'sans' })} />
              </Option>
              <Option styles={styles} label="Espaço entre linhas">
                {LINE_HEIGHTS.map(([k, l]) => <Chip key={k} styles={styles} label={l} active={epub.lineHeight === k} onPress={() => setEpub({ ...epub, lineHeight: k })} />)}
              </Option>
              <Option styles={styles} label="Margens">
                {MARGINS.map(([k, l]) => <Chip key={k} styles={styles} label={l} active={epub.margin === k} onPress={() => setEpub({ ...epub, margin: k })} />)}
              </Option>
              <Option styles={styles} label="Alinhamento">
                <Chip styles={styles} label="Justificado" active={epub.align === 'justify'} onPress={() => setEpub({ ...epub, align: 'justify' })} />
                <Chip styles={styles} label="À esquerda" active={epub.align === 'left'} onPress={() => setEpub({ ...epub, align: 'left' })} />
              </Option>
              <Option styles={styles} label="Separação de capítulos">
                <Chip styles={styles} label="Por capítulos" active={epub.split === 'headings'} onPress={() => setEpub({ ...epub, split: 'headings' })} />
                <Chip styles={styles} label="Texto contínuo" active={epub.split === 'none'} onPress={() => setEpub({ ...epub, split: 'none' })} />
              </Option>
            </View>
          ) : null}
        </View>
      ) : null}

      {format === 'pdf' ? (
        <View>
          <Option styles={styles} label="Tamanho da página">
            {PDF_SIZES.map(([k, l]) => <Chip key={k} styles={styles} label={l} active={pdf.pageSize === k} onPress={() => setPdf({ ...pdf, pageSize: k })} />)}
          </Option>
          <Option styles={styles} label="Tamanho da letra">
            {PDF_FONT.map(([k, l]) => <Chip key={k} styles={styles} label={l} active={pdf.fontSize === k} onPress={() => setPdf({ ...pdf, fontSize: k })} />)}
          </Option>
          <Toggle styles={styles} colors={colors} label="Incluir sumário" value={pdf.includeToc} onChange={(v) => setPdf({ ...pdf, includeToc: v })} />
          <Toggle styles={styles} colors={colors} label="Numeração de páginas" value={pdf.pageNumbers} onChange={(v) => setPdf({ ...pdf, pageNumbers: v })} />
          <Toggle styles={styles} colors={colors} label="Incluir imagens" hint="Só JPEG e PNG sem entrelaçamento entram no PDF." value={pdf.includeImages} onChange={(v) => setPdf({ ...pdf, includeImages: v })} />
          <Touchable style={styles.linkBtn} onPress={() => setShowAdvanced((v) => !v)}>
            <Text style={styles.linkText}>{showAdvanced ? 'Ocultar ajustes avançados' : 'Ajustes avançados'}</Text>
          </Touchable>
          {showAdvanced ? (
            <View>
              <Option styles={styles} label="Orientação">
                <Chip styles={styles} label="Retrato" active={pdf.orientation === 'portrait'} onPress={() => setPdf({ ...pdf, orientation: 'portrait' })} />
                <Chip styles={styles} label="Paisagem" active={pdf.orientation === 'landscape'} onPress={() => setPdf({ ...pdf, orientation: 'landscape' })} />
              </Option>
              <Option styles={styles} label="Margens">
                {MARGINS.map(([k, l]) => <Chip key={k} styles={styles} label={l} active={pdf.margin === k} onPress={() => setPdf({ ...pdf, margin: k })} />)}
              </Option>
              <Toggle styles={styles} colors={colors} label="Cabeçalho com o título" value={pdf.header} onChange={(v) => setPdf({ ...pdf, header: v })} />
              <Toggle styles={styles} colors={colors} label="Texto justificado" value={pdf.justify} onChange={(v) => setPdf({ ...pdf, justify: v })} />
            </View>
          ) : null}
        </View>
      ) : null}

      {format === 'json' ? (
        <Text style={styles.hint}>O JSON segue o padrão interno do app (título, capítulos e conteúdo) e não tem ajustes de aparência.</Text>
      ) : null}
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
    </View>
  );

  const renderPreview = () => {
    const first = imported.chapters[0];
    const sample = (first?.content || '').slice(0, 1100);
    const checks = result.verification.checks;
    const fontScale = { small: 0.92, medium: 1, large: 1.15, xlarge: 1.3 }[epub.fontSize] || 1;
    const margin = { narrow: 8, medium: 16, wide: 28 }[epub.margin] || 16;
    return (
      <View>
        <Text style={styles.sectionTitle}>Prévia do resultado</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{`${result.format.toUpperCase()} · ${result.chapters} ${result.chapters === 1 ? 'capítulo' : 'capítulos'}${result.format === 'pdf' ? ` · ${result.pages} páginas` : ''} · ${sizeKb(result.bytes.length)}`}</Text>
          {result.imagesIncluded ? <Text style={styles.hint}>{`${result.imagesIncluded} imagem(ns) incluída(s)`}</Text> : null}
        </View>

        <Text style={styles.label}>Conferência do arquivo gerado</Text>
        {checks.map((c) => (
          <View key={c.label} style={styles.checkRow}>
            <Ionicons name={c.ok ? 'checkmark-circle' : 'close-circle'} size={18} color={c.ok ? colors.success : colors.danger} />
            <Text style={styles.checkText}>{c.label}{c.detail ? ` (${c.detail})` : ''}</Text>
          </View>
        ))}

        {[...result.warnings, ...imported.warning ? [] : []].length ? (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>Nem tudo foi preservado perfeitamente</Text>
            {result.warnings.map((w) => <Text key={w} style={styles.warnText}>{`•  ${w}`}</Text>)}
          </View>
        ) : null}

        {result.format === 'epub' ? (
          <View>
            <Text style={styles.label}>Capa</Text>
            <View style={styles.cover}>
              <Text style={styles.coverTitle}>{title.trim() || info.doc.title}</Text>
              {author.trim() ? <Text style={styles.coverAuthor}>{author.trim()}</Text> : null}
            </View>
            <Text style={styles.label}>Sumário</Text>
            {result.toc.slice(0, 12).map((t, i) => <Text key={`${t}-${i}`} style={styles.bullet} numberOfLines={1}>{`${i + 1}.  ${t}`}</Text>)}
            {result.toc.length > 12 ? <Text style={styles.hint}>{`e mais ${result.toc.length - 12} capítulos`}</Text> : null}
            <Text style={styles.label}>Primeiro capítulo, com a formatação escolhida</Text>
            <View style={[styles.page, { paddingHorizontal: margin }]}>
              <Text style={[styles.pageTitle, { fontFamily: epub.fontFamily === 'sans' ? undefined : fonts.heading }]}>{first?.title}</Text>
              <Text style={{ fontSize: 14 * fontScale, lineHeight: 14 * fontScale * epub.lineHeight, color: colors.text, textAlign: epub.align === 'left' ? 'left' : 'justify', fontFamily: epub.fontFamily === 'sans' ? undefined : Platform.select({ ios: 'Georgia', default: 'serif' }) }}>
                {sample}{(first?.content || '').length > sample.length ? '…' : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {result.format === 'pdf' ? (
          <View>
            <Text style={styles.label}>Páginas (capa, sumário e início do texto)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {result.preview.pages.map((lines, i) => {
                const scale = 190 / result.preview.width;
                return (
                  <View key={i} style={[styles.pdfPage, { width: result.preview.width * scale, height: result.preview.height * scale }]} accessibilityLabel={`Página ${i + 1}`}>
                    <View style={[styles.pdfMargin, { margin: result.preview.margin * scale }]} />
                    {lines.map((l, k) => (
                      <Text key={k} numberOfLines={1} style={{ position: 'absolute', left: l.x * scale, top: (l.y - l.size) * scale, fontSize: Math.max(3, l.size * scale), fontWeight: l.bold ? '700' : '400', color: '#222', maxWidth: result.preview.width * scale - l.x * scale }}>{l.text}</Text>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
            <Text style={styles.hint}>As linhas tracejadas mostram as margens. O texto é desenhado dentro delas, sem cortes.</Text>
          </View>
        ) : null}

        {result.format === 'json' ? (
          <View>
            <Text style={styles.label}>Estrutura gerada</Text>
            {imported.chapters.slice(0, 6).map((c) => <Text key={c.id} style={styles.bullet} numberOfLines={1}>{`•  ${c.title} (${formatNumber(c.content.length)} caracteres, ${c.marks.length} marcas)`}</Text>)}
            <View style={styles.code}><Text style={styles.codeText}>{result.text.slice(0, 520)}…</Text></View>
          </View>
        ) : null}

        <Toggle styles={styles} colors={colors} label={`Salvar também uma cópia (${result.extension.toUpperCase()})`} hint="O arquivo original nunca é alterado nem apagado." value={saveCopy} onChange={setSaveCopy} />
        <Text style={styles.hint}>O livro entra na estante com o texto, os capítulos e o negrito e itálico do documento. Imagens e tabelas aparecem no arquivo convertido; no leitor do app elas viram marcações de texto.</Text>
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      </View>
    );
  };

  const footer = () => {
    if (step === 'recommend') {
      return (
        <View style={styles.footer}>
          <Touchable style={styles.ghostBtn} onPress={cancel}><Text style={styles.ghostText}>Cancelar</Text></Touchable>
          <Touchable style={styles.primaryBtnFlex} onPress={() => { setError(null); setStep('options'); }} accessibilityLabel="Continuar com o formato escolhido">
            <Text style={styles.primaryText}>{format === recommendation.format ? 'Aceitar recomendação' : `Continuar com ${FORMATS[format].name}`}</Text>
          </Touchable>
        </View>
      );
    }
    if (step === 'options') {
      return (
        <View style={styles.footer}>
          <Touchable style={styles.ghostBtn} onPress={() => setStep('recommend')}><Text style={styles.ghostText}>Voltar</Text></Touchable>
          <Touchable style={styles.primaryBtnFlex} onPress={runConversion}><Text style={styles.primaryText}>Converter e ver prévia</Text></Touchable>
        </View>
      );
    }
    if (step === 'preview') {
      return (
        <View style={styles.footer}>
          <Touchable style={styles.ghostBtn} onPress={() => { setError(null); setStep('options'); }} disabled={working}><Text style={styles.ghostText}>Ajustar</Text></Touchable>
          <Touchable style={[styles.primaryBtnFlex, working && { opacity: 0.6 }]} onPress={confirm} disabled={working} accessibilityLabel="Adicionar o livro à biblioteca">
            <Text style={styles.primaryText}>{working ? 'Adicionando...' : result.verification.ok ? 'Adicionar à biblioteca' : 'Adicionar mesmo assim'}</Text>
          </Touchable>
        </View>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancel}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Converter arquivo em livro</Text>
            <Text style={styles.hint}>Transforme seus documentos em livros digitais preparados para leitura no aplicativo.</Text>
          </View>
          <Touchable style={styles.close} onPress={cancel} accessibilityLabel="Fechar conversor">
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Touchable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'select' && renderSelect()}
          {step === 'analyzing' && renderAnalyzing()}
          {step === 'recommend' && info && renderRecommend()}
          {step === 'options' && info && renderOptions()}
          {step === 'converting' && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.sectionTitle}>Convertendo e conferindo o arquivo</Text>
              <Text style={styles.hint}>O app gera o arquivo, reabre no próprio leitor e compara o texto letra a letra.</Text>
            </View>
          )}
          {step === 'preview' && result && imported && renderPreview()}
        </ScrollView>
        {footer()}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 20, color: colors.text, fontFamily: fonts.heading },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  body: { padding: space.lg, paddingBottom: space.xxl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  lead: { fontSize: 15, color: colors.textSecondary, marginBottom: space.lg },
  drop: { alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.card },
  dropOn: { borderStyle: 'solid', borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dropTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: space.lg, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextOn: { color: colors.onPrimary },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.surfaceSoft },
  tagText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  primaryBtn: { flexDirection: 'row', minHeight: 46, paddingHorizontal: 20, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  primaryBtnFlex: { flex: 2, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.onPrimary, textAlign: 'center' },
  ghostBtn: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  footer: { flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, width: '100%', maxWidth: 720, alignSelf: 'center' },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.dangerBorder, marginTop: space.md },
  errorText: { flex: 1, fontSize: 13, color: colors.danger, lineHeight: 18 },
  warnBox: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warningBorder, marginTop: space.md, gap: 4 },
  warnTitle: { fontSize: 13, fontWeight: '700', color: colors.warningText },
  warnText: { fontSize: 12, lineHeight: 17, color: colors.warningText },
  centerBox: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  sectionTitle: { fontSize: 18, color: colors.text, fontFamily: fonts.heading, marginBottom: space.sm },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageText: { fontSize: 13, color: colors.textSecondary },
  stageNow: { color: colors.text, fontWeight: '700' },
  fileRow: { flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.md, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
  fileName: { fontSize: 14, fontWeight: '700', color: colors.text },
  bullet: { fontSize: 13, lineHeight: 20, color: colors.text },
  recBox: { marginTop: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary, gap: 6 },
  recTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  recText: { fontSize: 14, lineHeight: 20, color: colors.text },
  formatCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, marginBottom: space.sm },
  formatCardOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  formatName: { fontSize: 15, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.primary },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.onPrimary },
  linkBtn: { paddingVertical: space.md },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  compare: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, overflow: 'hidden' },
  compareRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  compareCell: { flex: 1, padding: 8, fontSize: 11, color: colors.text },
  compareHead: { fontWeight: '700', backgroundColor: colors.surfaceSoft },
  option: { marginTop: space.lg },
  optionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: space.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: space.md, fontSize: 14, color: colors.text },
  summary: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
  summaryText: { fontSize: 14, fontWeight: '700', color: colors.text },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  checkText: { flex: 1, fontSize: 13, color: colors.text },
  cover: { alignItems: 'center', justifyContent: 'center', padding: space.xl, borderRadius: radius.md, backgroundColor: colors.primary, minHeight: 150 },
  coverTitle: { fontSize: 20, color: colors.onPrimary, fontFamily: fonts.heading, textAlign: 'center' },
  coverAuthor: { fontSize: 14, color: colors.onPrimary, marginTop: 8, opacity: 0.9 },
  page: { paddingVertical: space.lg, borderRadius: radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.borderLight },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#1b1b1b', marginBottom: space.md },
  pdfPage: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  pdfMargin: { flex: 1, borderWidth: 1, borderColor: '#c9a98a', borderStyle: 'dashed' },
  code: { marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  codeText: { fontSize: 11, color: colors.textSecondary, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
