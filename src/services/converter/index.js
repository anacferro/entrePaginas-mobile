import { detectFile, decodeText, ConvertError, KIND_LABELS, ACCEPTED } from './detect.js';
import { ZipError } from './zip.js';
import { readDocx } from './readers/docx.js';
import { readOdt } from './readers/odt.js';
import { readRtf } from './readers/rtf.js';
import { readText } from './readers/text.js';
import { readHtml } from './readers/html.js';
import { readPdf } from './readers/pdf.js';
import { analyze, adviseWithAi, applyAdvice, FORMATS } from './analyze.js';
import { buildEpub, EPUB_DEFAULTS } from './writers/epub.js';
import { buildPdf, PDF_DEFAULTS } from './writers/pdf.js';
import { buildJson } from './writers/json.js';
import { bookChapters, estimateBookPages } from './book.js';
import { alnum, chaptersOf, blockText, stripMarks } from './model.js';
import { parseEpub } from '../epubParser.js';
import { parsePdf } from '../pdfParser.js';

export { ConvertError, KIND_LABELS, ACCEPTED, FORMATS, EPUB_DEFAULTS, PDF_DEFAULTS };

const MAX_CHARS = 6_000_000;

function friendly(error) {
  if (error instanceof ConvertError) return error;
  if (error instanceof ZipError) return new ConvertError(error.code, error.message);
  return new ConvertError('failed', error?.message || 'Não foi possível processar o arquivo.');
}

export function fingerprint({ name, size, lastModified }) {
  return `${String(name).toLowerCase()}|${size}|${lastModified || 0}`;
}

function parse(kind, bytes, name) {
  switch (kind) {
    case 'docx':
      return readDocx(bytes);
    case 'odt':
      return readOdt(bytes);
    case 'rtf':
      return readRtf(bytes);
    case 'pdf':
      return readPdf(bytes);
    case 'html':
    case 'xml':
      return readHtml(decodeText(bytes));
    case 'md':
      return readText(decodeText(bytes), { markdown: true, name });
    default:
      return readText(decodeText(bytes), { markdown: false, name });
  }
}

function titleFromName(name) {
  const base = String(name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Livro convertido';
}

export function inspect({ name, bytes, size, lastModified }) {
  try {
    const detected = detectFile({ name, bytes });
    if (detected.kind === 'xml' && !/<(p|div|h[1-6]|body|section|article)\b/i.test(decodeText(bytes.subarray(0, 200000)))) {
      throw new ConvertError('invalid', 'Este XML não tem uma estrutura de texto compatível (parágrafos ou títulos).');
    }
    const doc = parse(detected.kind, bytes, name);
    const totalChars = doc.blocks.reduce((n, b) => n + blockText(b).length, 0);
    if (totalChars > MAX_CHARS) throw new ConvertError('too-large', 'O texto do documento é grande demais para ser convertido no aparelho.');
    if (!doc.meta.scanned && totalChars === 0) throw new ConvertError('empty', 'Não encontrei nenhum texto neste documento.');
    if (!doc.title) doc.title = titleFromName(name);
    doc.meta.notes.unshift(...detected.warnings);
    const analysis = analyze(doc, { kind: detected.kind, name, size: size ?? bytes.length });
    return { kind: detected.kind, doc, ...analysis, fingerprint: fingerprint({ name, size: size ?? bytes.length, lastModified }) };
  } catch (e) {
    throw friendly(e);
  }
}

export async function advise(inspection, askAi) {
  if (!askAi) return inspection.recommendation;
  const level = inspection.doc.blocks.filter((b) => b.t === 'h' && b.level >= 1).map((b) => stripMarks(b.text));
  const { system, payload } = adviseWithAi(inspection.stats, inspection.recommendation, level);
  try {
    const raw = await askAi(system, payload);
    return applyAdvice(inspection.recommendation, raw);
  } catch {
    return inspection.recommendation;
  }
}

export function verify(doc, result, split = 'headings') {
  const expected = alnum(chaptersOf(doc, { split: result.options?.split || split }).map((c) => `${c.title} ${c.blocks.filter((b) => b.t !== 'img').map(blockText).join(' ')}`).join(' '));
  const checks = [];
  let ok = true;

  const subsequence = (needle, haystack) => {
    let i = 0;
    for (let j = 0; j < haystack.length && i < needle.length; j += 1) if (haystack.charCodeAt(j) === needle.charCodeAt(i)) i += 1;
    return i === needle.length ? 0 : needle.length - i;
  };

  try {
    if (result.format === 'epub') {
      const parsed = parseEpub(result.bytes);
      const got = alnum(parsed.chapters.map((c) => c.content).join(' '));
      const missing = subsequence(expected, got);
      checks.push({ label: 'EPUB abre no leitor do app', ok: parsed.chapters.length > 0 });
      checks.push({ label: 'Texto idêntico ao do documento', ok: missing === 0, detail: missing ? `${missing} caracteres não conferem` : null });
      checks.push({ label: 'Capítulos reconhecidos', ok: parsed.chapters.length >= result.chapters, detail: `${parsed.chapters.length} seções lidas` });
      ok = parsed.chapters.length > 0 && missing === 0;
    } else if (result.format === 'pdf') {
      const parsed = parsePdf(result.bytes);
      const got = alnum(parsed.text);
      const missing = subsequence(expected, got);
      checks.push({ label: 'PDF abre no leitor do app', ok: parsed.pages === result.pages, detail: `${parsed.pages} páginas` });
      checks.push({ label: 'Texto idêntico ao do documento', ok: missing === 0 && result.nonLatin === 0, detail: missing ? `${missing} caracteres não conferem` : result.nonLatin ? `${result.nonLatin} caractere(s) fora do alfabeto latino` : null });
      ok = parsed.pages === result.pages && missing === 0;
    } else {
      const data = JSON.parse(result.text);
      const got = alnum(data.chapters.map((c) => `${c.title} ${c.content}`).join(' '));
      const missing = subsequence(expected, got);
      checks.push({ label: 'JSON no padrão do app (title, chapters, content)', ok: Array.isArray(data.chapters) && data.chapters.length > 0 });
      checks.push({ label: 'Texto idêntico ao do documento', ok: missing === 0, detail: missing ? `${missing} caracteres não conferem` : null });
      ok = missing === 0 && data.chapters.length > 0;
    }
  } catch (e) {
    ok = false;
    checks.push({ label: 'Leitura do arquivo gerado', ok: false, detail: e.message });
  }
  return { ok, checks };
}

export function convert(doc, format, options = {}) {
  let result;
  try {
    if (format === 'epub') result = buildEpub(doc, options);
    else if (format === 'pdf') result = buildPdf(doc, options);
    else if (format === 'json') result = buildJson(doc, options);
    else throw new ConvertError('invalid', 'Formato de saída inválido.');
  } catch (e) {
    throw friendly(e);
  }
  const verification = verify(doc, result);
  const title = options.title || doc.title || 'Livro convertido';
  const safe = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'livro';
  return { ...result, verification, fileName: `${safe}.${result.extension}` };
}

export function toImported(doc, result, { title, author } = {}) {
  const split = result.options?.split || 'headings';
  const chapters = bookChapters(doc, { split });
  const pages = result.format === 'pdf' ? result.pages : estimateBookPages(chapters);
  const warnings = [...(result.warnings || []), ...doc.meta.notes];
  return {
    title: (title || doc.title || 'Livro convertido').trim(),
    subtitle: author || doc.author ? `Por ${author || doc.author}` : `Convertido de documento (${result.format.toUpperCase()})`,
    pages,
    chapters,
    warning: warnings.length ? warnings.slice(0, 4).join(' ') : null,
  };
}
