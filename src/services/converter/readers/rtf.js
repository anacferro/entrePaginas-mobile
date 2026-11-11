import { newDoc, BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE, stripMarks } from '../model.js';

const CP1252 = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

const SKIP_DESTINATIONS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'header', 'headerl', 'headerr', 'headerf', 'footer', 'footerl',
  'footerr', 'footerf', 'fldinst', 'themedata', 'listtable', 'listoverridetable', 'revtbl', 'generator', 'xmlnstbl',
  'latentstyles', 'datastore', 'colorschememapping', 'listtext', 'pntext', 'pntxta', 'pntxtb', 'rsidtbl', 'object',
  'bkmkstart', 'bkmkend', 'shpinst', 'nonshppict', 'private', 'wgrffmtfilter', 'fchars', 'lchars',
]);

const SYMBOLS = {
  emdash: '—', endash: '–', bullet: '•', lquote: '‘', rquote: '’', ldblquote: '“', rdblquote: '”', emspace: ' ',
  enspace: ' ', qmspace: ' ', tab: '\t', line: '\n',
};

function cp(code, codepage) {
  if (codepage !== 1252 && code >= 0x80) return null;
  return CP1252[code] || String.fromCharCode(code);
}

function balanced(raw, start) {
  let depth = 0;
  for (let i = start; i < raw.length; i += 1) {
    if (raw[i] === '\\') i += 1;
    else if (raw[i] === '{') depth += 1;
    else if (raw[i] === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return '';
}

function styleNames(raw, codepage) {
  const names = {};
  const at = raw.indexOf('{\\stylesheet');
  if (at < 0) return names;
  const sheet = balanced(raw, at);
  let i = 1;
  while (i < sheet.length) {
    if (sheet[i] !== '{') {
      i += 1;
      continue;
    }
    const entry = balanced(sheet, i);
    const id = entry.match(/^\{\\s(\d+)/)?.[1];
    if (id) {
      names[id] = entry
        .replace(/^\{|\}$/g, '')
        .replace(/\\[a-z]+-?\d*\s?|\\'[0-9a-f]{2}/gi, (m) => (m.startsWith("\\'") ? cp(parseInt(m.slice(2), 16), codepage) || '' : ''))
        .replace(/;/g, '')
        .trim();
    }
    i += Math.max(1, entry.length);
  }
  return names;
}

export function readRtf(bytes) {
  const raw = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  if (!/^\s*\{\\rtf/i.test(raw)) throw new Error('O arquivo não é um RTF válido.');
  const codepage = Number(raw.match(/\\ansicpg(\d+)/)?.[1]) || 1252;
  const names = styleNames(raw, codepage);
  const doc = newDoc();
  const notes = [];
  let lossy = false;

  const title = raw.match(/\{\\title\s+([^{}]*)\}/)?.[1];
  const author = raw.match(/\{\\author\s+([^{}]*)\}/)?.[1];
  if (title) doc.title = title.replace(/\\'([0-9a-f]{2})/gi, (_, h) => cp(parseInt(h, 16), codepage) || '').trim();
  if (author) doc.author = author.replace(/\\'([0-9a-f]{2})/gi, (_, h) => cp(parseInt(h, 16), codepage) || '').trim();
  const pages = Number(raw.match(/\\nofpages(\d+)/)?.[1]);
  if (pages > 0) doc.meta.pages = pages;
  else doc.meta.pagesEstimated = true;
  doc.meta.fonts = [...raw.matchAll(/\{\\f\d+[^{}]*?\s([^;{}\\]+);\}/g)].map((m) => m[1].trim()).filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 12);
  doc.meta.headerFooter = /\{\\(header|footer)[lrf]?\b[^}]*[A-Za-z0-9]/.test(raw);
  if (/\{\\\*?\\?fldinst[^}]*\bTOC\b/i.test(raw)) doc.meta.hasToc = true;

  let images = 0;
  let pos = 0;
  const stack = [];
  let state = { skip: false, bold: false, italic: false, uc: 1 };
  let text = '';
  let pstyle = null;
  let outline = null;
  let inTable = false;
  let rows = [];
  let cells = [];
  let list = false;
  let footBuffer = null;
  let footDepth = -1;

  const flushParagraph = () => {
    const plain = stripMarks(text).trim();
    const value = text.replace(/\u0002(\s*)\u0001/g, '$1').replace(/\u0004(\s*)\u0003/g, '$1').trim();
    text = '';
    if (!plain) {
      pstyle = null;
      return;
    }
    const styleName = names[pstyle] || '';
    const heading = styleName.match(/(?:heading|t[ií]tulo)\s*(\d)/i);
    const level = heading ? Number(heading[1]) : outline !== null ? outline + 1 : null;
    if (/^(title|t[ií]tulo)$/i.test(styleName)) {
      doc.blocks.push({ t: 'h', level: 0, text: plain });
      if (!doc.title) doc.title = plain;
    } else if (level && level <= 6 && plain.length < 300) doc.blocks.push({ t: 'h', level, text: plain.replace(/\s+/g, ' ') });
    else if (list) doc.blocks.push({ t: 'li', text: value, ordered: /^\d+[.)]/.test(plain) });
    else if (/quote|cita[cç][aã]o/i.test(styleName)) doc.blocks.push({ t: 'quote', text: value });
    else doc.blocks.push({ t: 'p', text: value });
  };

  const flushTable = () => {
    if (cells.length) {
      rows.push(cells);
      cells = [];
    }
    const filled = rows.filter((r) => r.some(Boolean));
    if (filled.length) doc.blocks.push({ t: 'table', rows: filled });
    rows = [];
    inTable = false;
  };

  const emit = (s) => {
    if (state.skip) return;
    if (footBuffer !== null) {
      footBuffer += s;
      return;
    }
    let out = s;
    if (state.bold && out.trim()) out = `${BOLD_OPEN}${out}${BOLD_CLOSE}`;
    if (state.italic && out.trim()) out = `${ITALIC_OPEN}${out}${ITALIC_CLOSE}`;
    text += out;
  };

  while (pos < raw.length) {
    const ch = raw[pos];
    if (ch === '{') {
      stack.push({ ...state });
      pos += 1;
      let probe = pos;
      if (raw[probe] === '\\' && raw[probe + 1] === '*') state.skip = true;
      else if (raw[probe] === '\\') {
        probe += 1;
        let word = '';
        while (/[a-z]/i.test(raw[probe] || '')) {
          word += raw[probe];
          probe += 1;
        }
        if (SKIP_DESTINATIONS.has(word) && word !== 'fldinst') state.skip = true;
        if (word === 'fldinst') state.skip = true;
        if (word === 'pict') images += 1;
        if (word === 'footnote') {
          footBuffer = '';
          footDepth = stack.length;
        }
      }
    } else if (ch === '}') {
      if (footBuffer !== null && stack.length === footDepth) {
        const note = footBuffer.replace(/\s+/g, ' ').trim();
        footBuffer = null;
        if (note) {
          notes.push(note);
          const prev = stack.pop() || state;
          state = prev;
          emit(`[${notes.length}]`);
          pos += 1;
          continue;
        }
        footBuffer = null;
      }
      state = stack.pop() || state;
      pos += 1;
    } else if (ch === '\\') {
      const next = raw[pos + 1];
      if (next === "'") {
        const code = parseInt(raw.slice(pos + 2, pos + 4), 16);
        const value = Number.isFinite(code) ? cp(code, codepage) : '';
        if (value === null) lossy = true;
        emit(value || (value === null ? '?' : ''));
        pos += 4;
      } else if (next === '\\' || next === '{' || next === '}') {
        emit(next);
        pos += 2;
      } else if (next === '~') {
        emit(' ');
        pos += 2;
      } else if (next === '_') {
        emit('-');
        pos += 2;
      } else if (next === '-' || next === '|' || next === ':') {
        pos += 2;
      } else if (next === '\n' || next === '\r') {
        if (!state.skip) {
          flushParagraph();
        }
        pos += 2;
      } else if (/[a-z]/i.test(next || '')) {
        let end = pos + 1;
        while (/[a-z]/i.test(raw[end] || '')) end += 1;
        const word = raw.slice(pos + 1, end);
        let paramStr = '';
        if (raw[end] === '-' || /\d/.test(raw[end] || '')) {
          paramStr += raw[end];
          end += 1;
          while (/\d/.test(raw[end] || '')) {
            paramStr += raw[end];
            end += 1;
          }
        }
        if (raw[end] === ' ') end += 1;
        const param = paramStr === '' ? null : Number(paramStr);
        pos = end;

        if (word === 'u') {
          let code = param;
          if (code < 0) code += 65536;
          emit(String.fromCharCode(code));
          let skip = state.uc;
          while (skip > 0 && pos < raw.length) {
            if (raw[pos] === '\\' && raw[pos + 1] === "'") pos += 4;
            else pos += 1;
            skip -= 1;
          }
        } else if (word === 'uc') state.uc = param ?? 1;
        else if (word === 'par' || word === 'sect') {
          if (!state.skip && footBuffer === null) {
            if (inTable) flushTable();
            flushParagraph();
          }
        } else if (word === 'pard') {
          pstyle = null;
          outline = null;
          list = false;
        } else if (word === 'plain') {
          state.bold = false;
          state.italic = false;
        } else if (word === 's' && param !== null) pstyle = String(param);
        else if (word === 'outlinelevel' && param !== null && param < 9) outline = param;
        else if (word === 'ls' || word === 'pnlvlblt') list = true;
        else if (word === 'b') state.bold = param !== 0;
        else if (word === 'i') state.italic = param !== 0;
        else if (word === 'intbl') inTable = true;
        else if (word === 'cell') {
          const cell = stripMarks(text).replace(/\s+/g, ' ').trim();
          text = '';
          cells.push(cell);
        } else if (word === 'row') {
          if (cells.length) rows.push(cells);
          cells = [];
        } else if (word === 'page' || word === 'pagebb') continue;
        else if (SYMBOLS[word] !== undefined) emit(SYMBOLS[word]);
      } else {
        pos += 2;
      }
    } else if (ch === '\r' || ch === '\n') {
      pos += 1;
    } else {
      emit(ch);
      pos += 1;
    }
  }
  if (inTable) flushTable();
  flushParagraph();

  notes.forEach((note, i) => doc.blocks.push({ t: 'p', text: `[${i + 1}] ${note}`, note: true }));
  doc.meta.footnotes = notes.length;
  if (images) {
    doc.meta.notes.push(`${images} imagem(ns) do RTF não são extraídas pelo app: o texto foi convertido sem elas.`);
    doc.meta.imagesDropped = images;
  }
  if (lossy) doc.meta.notes.push('Alguns caracteres usam uma codificação não suportada e foram trocados por "?".');
  doc.meta.lossy = lossy;
  return doc;
}
