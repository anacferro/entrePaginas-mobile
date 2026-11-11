export const BOLD_OPEN = '\u0001';
export const BOLD_CLOSE = '\u0002';
export const ITALIC_OPEN = '\u0003';
export const ITALIC_CLOSE = '\u0004';

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', middot: '·', deg: '°',
  sect: '§', para: '¶', times: '×', ccedil: 'ç', Ccedil: 'Ç', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó',
  uacute: 'ú', agrave: 'à', acirc: 'â', ecirc: 'ê', ocirc: 'ô', atilde: 'ã', otilde: 'õ', Aacute: 'Á', Eacute: 'É',
  Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Agrave: 'À', Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô', Atilde: 'Ã', Otilde: 'Õ',
  ntilde: 'ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', euml: 'ë', iuml: 'ï',
};

export function decodeEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, code) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
    }
    return NAMED[code] ?? NAMED[code.toLowerCase()] ?? whole;
  });
}

export function escapeXml(text) {
  return String(text)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function stripMarks(text) {
  return String(text || '').replace(/[\u0001-\u0004]/g, '');
}

export function newDoc(extra = {}) {
  return {
    title: '',
    author: '',
    language: 'pt',
    blocks: [],
    meta: {
      pages: null,
      pagesEstimated: false,
      fonts: [],
      hasToc: false,
      headerFooter: false,
      charts: 0,
      footnotes: 0,
      macros: false,
      notes: [],
      lossy: false,
      scanned: false,
    },
    ...extra,
  };
}

export function blockText(block) {
  switch (block.t) {
    case 'table':
      return block.rows.map((row) => row.map(stripMarks).join(' | ')).join('\n');
    case 'img':
      return block.alt ? `[Imagem: ${block.alt}]` : '[Imagem]';
    default:
      return stripMarks(block.text);
  }
}

export function countWords(text) {
  const matches = stripMarks(text).match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu);
  return matches ? matches.length : 0;
}

export function docText(doc) {
  return doc.blocks.map(blockText).join('\n\n');
}

export function alnum(text) {
  return stripMarks(text).normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

const SECTION_CHARS = 9000;
const MAX_CHAPTER = 100000;

export function chapterLevelOf(doc) {
  const levels = doc.blocks.filter((b) => b.t === 'h' && b.level >= 1).map((b) => b.level);
  if (!levels.length) return null;
  return Math.min(...levels);
}

function textLength(block) {
  return blockText(block).length;
}

function splitOversized(chapter) {
  const size = chapter.blocks.reduce((n, b) => n + textLength(b) + 2, 0);
  if (size <= MAX_CHAPTER) return [chapter];
  const parts = [];
  let current = [];
  let length = 0;
  chapter.blocks.forEach((block) => {
    const len = textLength(block) + 2;
    if (current.length && length + len > MAX_CHAPTER) {
      parts.push(current);
      current = [];
      length = 0;
    }
    current.push(block);
    length += len;
  });
  if (current.length) parts.push(current);
  return parts.map((blocks, i) => ({ ...chapter, title: `${chapter.title} (${i + 1}/${parts.length})`, blocks }));
}

export function chaptersOf(doc, { split = 'headings' } = {}) {
  const body = doc.blocks.filter((b) => !(b.t === 'h' && b.level === 0));
  const level = chapterLevelOf({ blocks: body });
  let chapters = [];

  if (split === 'none' || level === null) {
    if (split === 'none' || body.reduce((n, b) => n + textLength(b), 0) <= SECTION_CHARS) {
      chapters = [{ title: doc.title || 'Texto', blocks: body, explicit: false }];
    } else {
      let current = [];
      let length = 0;
      body.forEach((block) => {
        const len = textLength(block) + 2;
        if (current.length && length + len > SECTION_CHARS) {
          chapters.push({ blocks: current, explicit: false });
          current = [];
          length = 0;
        }
        current.push(block);
        length += len;
      });
      if (current.length) chapters.push({ blocks: current, explicit: false });
      chapters = chapters.map((c, i) => ({ ...c, title: `Seção ${i + 1}` }));
    }
  } else {
    let current = null;
    body.forEach((block) => {
      if (block.t === 'h' && block.level === level) {
        current = { title: stripMarks(block.text).replace(/\s+/g, ' ').trim() || 'Sem título', blocks: [], explicit: true };
        chapters.push(current);
      } else {
        if (!current) {
          current = { title: doc.title || 'Início', blocks: [], explicit: false };
          chapters.push(current);
        }
        current.blocks.push(block);
      }
    });
    chapters = chapters.filter((c) => c.blocks.length || c.explicit);
  }

  const merged = [];
  let carry = null;
  chapters.forEach((chapter) => {
    let next = chapter;
    if (carry) {
      next = {
        ...chapter,
        blocks: [{ t: 'h', level: 2, text: carry.title }, ...carry.blocks, ...chapter.blocks],
      };
      carry = null;
    }
    const length = next.blocks.reduce((n, b) => n + textLength(b), 0) + next.title.length;
    if (length < 40 && chapter !== chapters[chapters.length - 1]) carry = next;
    else merged.push(next);
  });
  if (carry) merged.push(carry);
  if (!merged.length) merged.push({ title: doc.title || 'Texto', blocks: [], explicit: false });

  return merged.flatMap(splitOversized).map((c, i) => ({ ...c, index: i + 1 }));
}

export function blocksToContent(blocks) {
  const lines = [];
  let ordinal = 0;
  blocks.forEach((block) => {
    if (block.t === 'li') {
      ordinal = block.ordered ? ordinal + 1 : 0;
      lines.push(`${block.ordered ? `${ordinal}.` : '•'} ${block.text}`);
      return;
    }
    ordinal = 0;
    if (block.t === 'table') lines.push(block.rows.map((row) => row.join(' | ')).join('\n'));
    else if (block.t === 'img') lines.push(block.alt ? `[Imagem: ${block.alt}]` : '[Imagem]');
    else lines.push(block.text);
  });
  const joined = [];
  blocks.forEach((block, i) => {
    const next = blocks[i + 1];
    joined.push(lines[i]);
    if (next) joined.push(block.t === 'li' && next.t === 'li' ? '\n' : '\n\n');
  });
  return joined.join('');
}

export function wordsOfBlocks(blocks) {
  return blocks.reduce((n, b) => n + countWords(blockText(b)), 0);
}
