import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parsePdf } from './pdfParser';
import { parseEpub } from './epubParser';
import { looksLikeHtml, htmlToText, extractSentinelMarks, stripSentinels } from './htmlText';
import { rebuildChapters } from './textRebuild/index.js';

const CHAPTER_SIZE = 1800;
const MAX_CHAPTER = 150000;
const MAX_CONVERT_BYTES = 30 * 1024 * 1024;

const PICKER_TYPES = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  txt: '*/*',
  json: '*/*',
};

async function readBytes(asset) {
  if (Platform.OS === 'web') {
    return new Uint8Array(await asset.file.arrayBuffer());
  }
  return new File(asset.uri).bytes();
}

async function readText(asset) {
  if (Platform.OS === 'web') {
    return asset.file.text();
  }
  return new File(asset.uri).text();
}

function titleFromFileName(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Obra Importada';
}

function estimatePages(text) {
  return Math.max(1, Math.ceil(text.length / CHAPTER_SIZE));
}

function chunkIntoChapters(text, prefix = 'Parte') {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chapters = [];
  let buffer = '';

  paragraphs.forEach((p) => {
    if (buffer && buffer.length + p.length > CHAPTER_SIZE) {
      chapters.push(buffer);
      buffer = '';
    }
    buffer = buffer ? `${buffer}\n\n${p}` : p;
  });
  if (buffer) chapters.push(buffer);

  return chapters.map((content, idx) => ({
    id: `chap-${Date.now()}-${idx + 1}`,
    title: chapters.length > 1 ? `${prefix} ${idx + 1}` : 'Capítulo 1',
    content,
  }));
}

function capChapters(chapters) {
  const stamp = Date.now();
  const out = [];

  chapters.forEach((chapter) => {
    if (chapter.content.length <= MAX_CHAPTER) {
      out.push(chapter);
      return;
    }
    const parts = [];
    let buffer = '';
    chapter.content.split(/\n{2,}/).forEach((paragraph) => {
      if (buffer && buffer.length + paragraph.length > MAX_CHAPTER) {
        parts.push(buffer);
        buffer = '';
      }
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    });
    if (buffer) parts.push(buffer);
    parts.forEach((content, idx) => {
      out.push({ ...chapter, title: `${chapter.title} (${idx + 1}/${parts.length})`, content });
    });
  });

  return out.map((chapter, idx) => ({ ...chapter, id: `chap-${stamp}-${idx + 1}` }));
}

function splitByHeadings(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    const heading = line.match(/^#{1,3}\s+(.+)$/) || line.match(/^\s*((cap[ií]tulo|parte)\b.*)$/i);
    if (heading) {
      current = { title: heading[1].trim(), lines: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { title: null, lines: [] };
        sections.push(current);
      }
      current.lines.push(line);
    }
  });

  const filled = sections
    .map(s => ({ title: s.title, content: s.lines.join('\n').trim() }))
    .filter(s => s.content);

  if (filled.length <= 1 || !filled.some(s => s.title)) {
    return chunkIntoChapters(text.replace(/\r\n?/g, '\n'));
  }

  return capChapters(filled.map((s, idx) => ({
    id: `chap-${Date.now()}-${idx + 1}`,
    title: s.title || 'Introdução',
    content: s.content,
  })));
}

function reflow(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function extractItalics(content) {
  const marks = [];
  const pattern = /_([^_\n]{1,300}?)_/g;
  let out = '';
  let last = 0;
  let match;

  while ((match = pattern.exec(content))) {
    out += content.slice(last, match.index);
    const start = out.length;
    out += match[1];
    marks.push({
      id: `mark-${Date.now()}-${marks.length}`,
      start,
      end: out.length,
      type: 'italic',
      color: null,
      text: match[1],
    });
    last = match.index + match[0].length;
  }

  return { content: out + content.slice(last), marks };
}

function isReadable(text) {
  if (text.length < 30) return false;
  const letters = text.match(/[A-Za-zÀ-ÿ]/g)?.length || 0;
  return letters / text.length > 0.55;
}

async function importPdf(asset) {
  const { pages, title, text, fontHint, rebuild } = parsePdf(await readBytes(asset), { rebuild: false });
  const bookTitle = title || titleFromFileName(asset.name);

  if (!isReadable(text)) {
    return {
      title: bookTitle,
      subtitle: 'Importado de PDF',
      pages,
      fontHint,
      warning: 'O texto deste PDF não pôde ser extraído. Ele pode ser digitalizado (imagem) ou usar fontes protegidas.',
      chapters: [
        {
          id: `chap-${Date.now()}-1`,
          title: 'Documento Importado',
          content: `Este PDF possui ${pages} ${pages === 1 ? 'página' : 'páginas'}, mas o texto não pôde ser extraído automaticamente. Use o editor do leitor para transcrever o conteúdo.`,
        },
      ],
    };
  }

  const { chapters, summary } = rebuildChapters(splitByHeadings(text), { source: 'pdf' });
  return {
    title: bookTitle,
    subtitle: 'Importado de PDF',
    pages: Math.max(pages, estimatePages(chapters.map(c => c.content).join(''))),
    fontHint,
    chapters,
    normalization: { ...summary, removed: rebuild?.removed || null },
  };
}

async function importEpub(asset) {
  const { title, author, chapters, font, fontHint } = parseEpub(await readBytes(asset));
  const rebuilt = rebuildChapters(chapters, { source: 'epub' });
  const fullText = rebuilt.chapters.map(c => c.content).join(' ');

  return {
    title: title || titleFromFileName(asset.name),
    subtitle: author ? `Por ${author}` : 'Importado de EPUB',
    pages: estimatePages(fullText),
    font,
    fontHint,
    chapters: capChapters(rebuilt.chapters.map((c, idx) => ({ ...c, id: `chap-${Date.now()}-${idx + 1}` }))),
    normalization: rebuilt.summary,
  };
}

async function importText(asset) {
  const text = (await readText(asset)).trim();
  if (!text) throw new Error('O arquivo de texto está vazio.');
  const markdown = /\.(md|markdown)$/i.test(asset.name);
  const { chapters, summary } = rebuildChapters(splitByHeadings(text), { source: markdown ? 'plain' : 'txt' });

  return {
    title: titleFromFileName(asset.name),
    subtitle: 'Importado de arquivo de texto',
    pages: estimatePages(chapters.map(c => c.content).join('')),
    chapters,
    normalization: summary,
  };
}

async function importJson(asset) {
  let data;
  try {
    data = JSON.parse(await readText(asset));
  } catch {
    throw new Error('O arquivo JSON está mal formatado.');
  }

  const book = Array.isArray(data) ? { chapters: data } : data;
  const chapters = (book.chapters || book.pages || [])
    .filter(c => c && (c.content || c.text))
    .map((c, idx) => ({
      id: `chap-${Date.now()}-${idx + 1}`,
      title: c.title || `Capítulo ${idx + 1}`,
      content: String(c.content || c.text),
    }));

  if (chapters.length === 0) {
    throw new Error('O JSON precisa ter uma lista "chapters" com "title" e "content".');
  }

  const fullText = chapters.map(c => c.content).join('\n\n');
  return {
    title: book.title || titleFromFileName(asset.name),
    subtitle: book.subtitle || 'Importado de estrutura JSON',
    pages: book.totalPages || estimatePages(fullText),
    chapters: capChapters(chapters),
  };
}

async function importAsset(format, asset) {
  const extension = asset.name.split('.').pop().toLowerCase();

  if (format === 'epub' && extension !== 'epub') {
    throw new Error('Esse quadro é para arquivos .epub.');
  }
  if (format === 'pdf' && extension !== 'pdf') {
    throw new Error('Esse quadro é para arquivos .pdf.');
  }
  if (format === 'txt' && !['txt', 'md', 'markdown'].includes(extension)) {
    throw new Error('Esse quadro é para arquivos .txt ou .md.');
  }
  if (format === 'json' && extension !== 'json') {
    throw new Error('Esse quadro é para arquivos .json.');
  }

  const imported =
    format === 'pdf' ? await importPdf(asset) :
    format === 'epub' ? await importEpub(asset) :
    format === 'json' ? await importJson(asset) :
    await importText(asset);

  return { ...imported, name: asset.name };
}

export const importer = {
  fromGutenberg(source) {
    const isHtml = looksLikeHtml(source);
    const flowed = reflow(isHtml ? htmlToText(source) : source);
    const chapters = splitByHeadings(flowed).map((chapter) => {
      const { content, marks } = isHtml ? extractSentinelMarks(chapter.content) : extractItalics(chapter.content);
      return { ...chapter, title: stripSentinels(chapter.title), content, marks };
    });
    return { pages: estimatePages(chapters.map(c => c.content).join('')), chapters };
  },

  async pickAndImport(format) {
    const result = await DocumentPicker.getDocumentAsync({
      type: PICKER_TYPES[format] || '*/*',
      copyToCacheDirectory: true,
      base64: false,
    });

    if (result.canceled || !result.assets?.length) return null;
    return importAsset(format, result.assets[0]);
  },

  async pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, base64: false });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_CONVERT_BYTES) throw new Error(`O arquivo passa do limite de ${MAX_CONVERT_BYTES / 1048576} MB.`);
    return { name: asset.name, size: asset.size, lastModified: asset.lastModified, bytes: await readBytes(asset) };
  },

  async readDroppedDocument(file) {
    if (file.size > MAX_CONVERT_BYTES) throw new Error(`O arquivo passa do limite de ${MAX_CONVERT_BYTES / 1048576} MB.`);
    return { name: file.name, size: file.size, lastModified: file.lastModified, bytes: new Uint8Array(await file.arrayBuffer()) };
  },

  importDroppedFile(format, file) {
    return importAsset(format, { file, name: file.name, uri: null });
  },
};
