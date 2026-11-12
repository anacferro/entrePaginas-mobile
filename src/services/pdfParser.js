import { inflate } from 'pako';
import { dominantFont } from './fontHints.js';
import { assemblePages } from './textRebuild/pdfLayout.js';
import { rebuildText } from './textRebuild/index.js';
import { createPictureReader } from './pictures/pdfPictures.js';
import { PICTURE_LIMITS } from './pictures/select.js';

const WIN_ANSI = {
  0x80: '€', 0x85: '…', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”',
  0x95: '•', 0x96: '–', 0x97: '—', 0x99: '™',
};

function bytesToLatin1(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return out;
}

function findBalanced(str, start, open, close) {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str.startsWith(open, i)) {
      depth++;
      i += open.length - 1;
    } else if (str.startsWith(close, i)) {
      depth--;
      if (depth === 0) return str.slice(start, i + close.length);
      i += close.length - 1;
    }
  }
  return str.slice(start);
}

function dictValue(dict, key) {
  const match = new RegExp(`/${key}(?![A-Za-z0-9])\\s*`).exec(dict);
  if (!match) return null;

  const pos = match.index + match[0].length;
  const rest = dict.slice(pos);
  if (rest.startsWith('<<')) return findBalanced(dict, pos, '<<', '>>');
  if (rest.startsWith('[')) return findBalanced(dict, pos, '[', ']');

  const ref = rest.match(/^(\d+)\s+\d+\s+R/);
  if (ref) return { ref: Number(ref[1]) };

  const token = rest.match(/^\/?[^\s/<>[\]()]+/);
  return token ? token[0] : null;
}

function refsIn(str) {
  return [...(str || '').matchAll(/(\d+)\s+\d+\s+R/g)].map(m => Number(m[1]));
}

function streamText(obj) {
  if (!obj?.data) return '';
  if (/\/FlateDecode/.test(obj.dict)) {
    try {
      return bytesToLatin1(inflate(obj.data));
    } catch {
      return '';
    }
  }
  return /\/Filter/.test(obj.dict) ? '' : bytesToLatin1(obj.data);
}

function parseObjects(raw, bytes) {
  const objects = new Map();
  const re = /(\d+)\s+\d+\s+obj\b/g;
  let match;

  while ((match = re.exec(raw))) {
    const bodyStart = match.index + match[0].length;
    const endObj = raw.indexOf('endobj', bodyStart);
    const end = endObj === -1 ? raw.length : endObj;
    const streamIdx = raw.indexOf('stream', bodyStart);

    if (streamIdx !== -1 && streamIdx < end && raw.slice(bodyStart, streamIdx).includes('<<')) {
      let dataStart = streamIdx + 6;
      if (raw[dataStart] === '\r') dataStart++;
      if (raw[dataStart] === '\n') dataStart++;
      const dataEnd = raw.lastIndexOf('endstream', end);
      objects.set(Number(match[1]), {
        dict: raw.slice(bodyStart, streamIdx),
        data: bytes.subarray(dataStart, dataEnd > dataStart ? dataEnd : end),
      });
    } else {
      objects.set(Number(match[1]), { dict: raw.slice(bodyStart, end) });
    }
    re.lastIndex = end;
  }

  [...objects.values()].forEach((obj) => {
    if (!/\/Type\s*\/ObjStm/.test(obj.dict)) return;
    const content = streamText(obj);
    const count = Number(dictValue(obj.dict, 'N'));
    const first = Number(dictValue(obj.dict, 'First'));
    if (!content || !count) return;

    const header = content.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < count; i++) {
      const num = header[i * 2];
      const start = first + header[i * 2 + 1];
      const end = i + 1 < count ? first + header[(i + 1) * 2 + 1] : content.length;
      if (!objects.has(num)) objects.set(num, { dict: content.slice(start, end) });
    }
  });

  return objects;
}

function parseCMap(text) {
  const map = new Map();
  const toStr = (hex) => {
    if (hex.length <= 2) return String.fromCharCode(parseInt(hex, 16));
    let s = '';
    for (let i = 0; i < hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return s;
  };

  (text.match(/beginbfchar[\s\S]*?endbfchar/g) || []).forEach((block) => {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      map.set(parseInt(m[1], 16), toStr(m[2]));
    }
  });

  (text.match(/beginbfrange[\s\S]*?endbfrange/g) || []).forEach((block) => {
    for (const m of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([^\]]*)\])/g)) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      if (m[3] !== undefined) {
        const prefix = m[3].length > 4 ? toStr(m[3].slice(0, -4)) : '';
        const base = parseInt(m[3].slice(-4), 16);
        for (let c = lo; c <= hi && c - lo < 65536; c++) {
          map.set(c, prefix + String.fromCharCode(base + c - lo));
        }
      } else {
        [...m[4].matchAll(/<([0-9a-fA-F]+)>/g)].forEach((item, i) => map.set(lo + i, toStr(item[1])));
      }
    }
  });

  return map;
}

function getPages(objects) {
  const pages = [];
  const resolve = (val) => (val?.ref ? objects.get(val.ref)?.dict || '' : val || '');

  const visit = (num, inherited, depth) => {
    const node = objects.get(num);
    if (!node || depth > 32) return;
    const resources = dictValue(node.dict, 'Resources') ?? inherited;

    if (/\/Type\s*\/Pages(?![A-Za-z])/.test(node.dict)) {
      refsIn(resolve(dictValue(node.dict, 'Kids'))).forEach(kid => visit(kid, resources, depth + 1));
    } else {
      pages.push({ dict: node.dict, resources });
    }
  };

  const catalog = [...objects.values()].find(o => /\/Type\s*\/Catalog/.test(o.dict));
  const root = catalog && dictValue(catalog.dict, 'Pages');
  if (root?.ref) visit(root.ref, null, 0);

  if (pages.length === 0) {
    objects.forEach((o) => {
      if (/\/Type\s*\/Page(?![A-Za-z])/.test(o.dict)) {
        pages.push({ dict: o.dict, resources: dictValue(o.dict, 'Resources') });
      }
    });
  }

  return { pages, resolve };
}

function stringCodes(token, font) {
  let codes = [];
  if (token.startsWith('(')) {
    const inner = token
      .slice(1, -1)
      .replace(/\\(\r\n|\r|\n)/g, '')
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\(.)/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[c] ?? c));
    codes = [...inner].map(c => c.charCodeAt(0));
  } else {
    const hex = token.slice(1, -1).replace(/\s+/g, '');
    for (let i = 0; i < hex.length; i += 2) codes.push(parseInt(hex.slice(i, i + 2).padEnd(2, '0'), 16));
  }

  if (font?.twoByte) {
    const combined = [];
    for (let i = 0; i + 1 < codes.length; i += 2) combined.push((codes[i] << 8) | codes[i + 1]);
    codes = combined;
  }

  return codes;
}

function stringAdvance(token, font) {
  const width = font?.width;
  return stringCodes(token, font).reduce((total, code) => total + (width ? width(code) : 500), 0);
}

function decodeString(token, font) {
  return stringCodes(token, font)
    .map((code) => {
      if (font?.cmap?.has(code)) return font.cmap.get(code);
      if (font?.twoByte) return '';
      return WIN_ANSI[code] || String.fromCharCode(code);
    })
    .join('');
}

function extractPageText(content, fonts) {
  const tokenRe = /\/([^\s/<>[\]()]+)\s+-?[\d.]+\s+Tf|\[((?:\((?:\\[\s\S]|[^\\)])*\)|<[0-9a-fA-F\s]*>|[^\]])*)\]\s*TJ|(\((?:\\[\s\S]|[^\\)])*\)|<[0-9a-fA-F\s]*>)\s*(Tj|'|")|(-?[\d.]+)\s+(-?[\d.]+)\s+T[dD]|(-?[\d.]+)\s+Tm\b|T\*|\bET\b/g;
  let font = null;
  let lastY = null;
  let text = '';
  let token;

  while ((token = tokenRe.exec(content))) {
    if (token[1] !== undefined) {
      font = fonts.get(token[1]) || null;
    } else if (token[2] !== undefined) {
      (token[2].match(/\((?:\\[\s\S]|[^\\)])*\)|<[0-9a-fA-F\s]*>|-?[\d.]+/g) || []).forEach((part) => {
        if (part.startsWith('(') || part.startsWith('<')) text += decodeString(part, font);
        else if (Number(part) < -180) text += ' ';
      });
    } else if (token[3] !== undefined) {
      if (token[4] !== 'Tj') text += '\n';
      text += decodeString(token[3], font);
    } else if (token[5] !== undefined) {
      text += Number(token[6]) !== 0 ? '\n' : ' ';
    } else if (token[7] !== undefined) {
      const y = Number(token[7]);
      text += lastY !== null && Math.abs(y - lastY) > 1 ? '\n' : ' ';
      lastY = y;
    } else {
      text += '\n';
    }
  }

  return text;
}

function extractPageLines(content, fonts) {
  const tokenRe = /\/([^\s/<>[\]()]+)\s+(-?[\d.]+)\s+Tf|\[((?:\((?:\\[\s\S]|[^\\)])*\)|<[0-9a-fA-F\s]*>|[^\]])*)\]\s*TJ|(\((?:\\[\s\S]|[^\\)])*\)|<[0-9a-fA-F\s]*>)\s*(Tj|'|")|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm\b|(-?[\d.]+)\s+(-?[\d.]+)\s+T([dD])|(-?[\d.]+)\s+TL\b|T\*|\bBT\b/g;
  const lines = [];
  let font = null;
  let size = 12;
  let scale = 1;
  let x = 0;
  let y = 0;
  let leading = 0;
  let line = null;
  let moved = false;
  let pen = null;
  let hscale = 1;
  let token;

  const effective = () => Math.max(1, Math.abs(size * scale));
  const show = (text, advance = 0) => {
    if (!text) return;
    if (!line || Math.abs(line.y - y) > effective() * 0.3) {
      line = { x, y, size: effective(), text: '' };
      lines.push(line);
    } else if (moved && x > line.x && !/\s$/.test(line.text) && !/^\s/.test(text)) {
      if (pen === null || x - pen > effective() * 0.2) line.text += ' ';
    }
    moved = false;
    line.text += text;
    pen = x + (advance / 1000) * Math.abs(size) * hscale;
  };
  const nextLine = (dx, dy) => {
    x += dx;
    y += dy;
    moved = true;
  };

  while ((token = tokenRe.exec(content))) {
    if (token[1] !== undefined) {
      font = fonts.get(token[1]) || null;
      size = Number(token[2]) || size;
    } else if (token[3] !== undefined) {
      let text = '';
      let advance = 0;
      (token[3].match(/\((?:\\[\s\S]|[^\\)])*\)|<[0-9a-fA-F\s]*>|-?[\d.]+/g) || []).forEach((part) => {
        if (part.startsWith('(') || part.startsWith('<')) {
          text += decodeString(part, font);
          advance += stringAdvance(part, font);
        } else {
          advance -= Number(part);
          if (Number(part) < -180) text += ' ';
        }
      });
      show(text, advance);
    } else if (token[4] !== undefined) {
      if (token[5] !== 'Tj') nextLine(0, -(leading || effective() * 1.2));
      show(decodeString(token[4], font), stringAdvance(token[4], font));
    } else if (token[6] !== undefined) {
      scale = Math.abs(Number(token[9])) || 1;
      hscale = Math.abs(Number(token[6])) || 1;
      x = Number(token[10]);
      y = Number(token[11]);
      moved = true;
    } else if (token[12] !== undefined) {
      const dy = Number(token[13]);
      if (token[14] === 'D') leading = -dy;
      nextLine(Number(token[12]), dy);
    } else if (token[15] !== undefined) {
      leading = Number(token[15]);
    } else if (/^T\*/.test(token[0])) {
      nextLine(0, -(leading || effective() * 1.2));
    } else {
      x = 0;
      y = 0;
      scale = 1;
      hscale = 1;
      pen = null;
      line = null;
    }
  }

  return lines.filter(l => l.text.trim());
}

function summarizeRemoved(removed) {
  const counts = { 'numero-de-pagina': 0, cabecalho: 0, rodape: 0 };
  removed.forEach((r) => {
    counts[r.kind] = (counts[r.kind] || 0) + 1;
  });
  return counts;
}

function mediaHeight(page, resolve) {
  const box = resolve(dictValue(page.dict, 'MediaBox'));
  const nums = String(box || '').match(/-?[\d.]+/g)?.map(Number);
  return nums && nums.length >= 4 ? nums[3] - nums[1] : null;
}

function normalizeText(text) {
  const lines = text
    .replace(/[^\S\n]+/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const isHeading = line => /^(cap[ií]tulo|parte)\b/i.test(line) && line.length < 80;
  let result = '';
  let breakNext = false;

  lines.forEach((line) => {
    if (!result) result = line;
    else if (breakNext || isHeading(line) || /[.!?:»”"]$/.test(result)) result += `\n\n${line}`;
    else if (/[A-Za-zÀ-ÿ]-$/.test(result)) result = result.slice(0, -1) + line;
    else result += ` ${line}`;
    breakNext = isHeading(line);
  });
  return result;
}

function decodeInfoTitle(raw) {
  const hex = raw.match(/\/Title\s*<([0-9a-fA-F\s]+)>/)?.[1]?.replace(/\s+/g, '');
  if (hex?.toUpperCase().startsWith('FEFF')) {
    let s = '';
    for (let i = 4; i + 3 < hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return s.trim();
  }

  const literal = raw.match(/\/Title\s*\(((?:\\[\s\S]|[^\\)])*)\)/)?.[1] || '';
  if (literal.startsWith('\xFE\xFF')) {
    const codes = decodeString(`(${literal})`, null);
    let s = '';
    for (let i = 2; i + 1 < codes.length; i += 2) s += String.fromCharCode((codes.charCodeAt(i) << 8) | codes.charCodeAt(i + 1));
    return s.trim();
  }
  return literal.trim();
}

export function parsePdf(bytes, { rebuild = true, pictures: withPictures = false } = {}) {
  const raw = bytesToLatin1(bytes);
  if (!raw.startsWith('%PDF')) {
    throw new Error('O arquivo selecionado não é um PDF válido.');
  }
  if (/\/Encrypt\b/.test(raw)) {
    throw new Error('Este PDF é protegido por senha e não pode ser importado.');
  }

  const objects = parseObjects(raw, bytes);
  const { pages, resolve } = getPages(objects);
  const fontCache = new Map();
  const reader = withPictures ? createPictureReader({ objects, dictValue }) : null;

  const numbersOf = (value) => (String(resolve(value)).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

  const fontWidths = (dict) => {
    if (/\/Subtype\s*\/Type0/.test(dict)) {
      const descendant = objects.get(refsIn(String(resolve(dictValue(dict, 'DescendantFonts'))))[0])?.dict || '';
      const fallback = Number(/\/DW\s+(\d+(?:\.\d+)?)/.exec(descendant)?.[1]) || 1000;
      const table = new Map();
      const raw = String(resolve(dictValue(descendant, 'W')));
      for (const m of raw.matchAll(/(\d+)\s*\[([^\]]*)\]|(\d+)\s+(\d+)\s+(-?\d+(?:\.\d+)?)/g)) {
        if (m[1] !== undefined) {
          (m[2].match(/-?\d+(?:\.\d+)?/g) || []).forEach((w, i) => table.set(Number(m[1]) + i, Number(w)));
        } else {
          for (let c = Number(m[3]); c <= Number(m[4]) && c - Number(m[3]) < 65536; c += 1) table.set(c, Number(m[5]));
        }
      }
      return (code) => table.get(code) ?? fallback;
    }
    const first = Number(dictValue(dict, 'FirstChar'));
    const list = numbersOf(dictValue(dict, 'Widths'));
    if (!list.length || Number.isNaN(first)) return null;
    return (code) => list[code - first] ?? 500;
  };

  const loadFont = (num) => {
    if (fontCache.has(num)) return fontCache.get(num);
    const dict = objects.get(num)?.dict || '';
    const toUnicode = dictValue(dict, 'ToUnicode');
    const font = {
      twoByte: /\/Subtype\s*\/Type0/.test(dict),
      cmap: toUnicode?.ref ? parseCMap(streamText(objects.get(toUnicode.ref))) : null,
      width: fontWidths(dict),
    };
    fontCache.set(num, font);
    return font;
  };

  const pageTexts = pages.map((page, pageIndex) => {
    const fontDict = resolve(dictValue(resolve(page.resources), 'Font'));
    const fonts = new Map();
    for (const m of fontDict.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
      fonts.set(m[1], loadFont(Number(m[2])));
    }

    const contents = dictValue(page.dict, 'Contents');
    const streamNums = contents?.ref
      ? (/\/Length/.test(objects.get(contents.ref)?.dict || '') ? [contents.ref] : refsIn(objects.get(contents.ref)?.dict))
      : refsIn(contents);

    const stream = streamNums.map(n => streamText(objects.get(n))).join('\n');
    return {
      text: extractPageText(stream, fonts),
      lines: extractPageLines(stream, fonts),
      height: mediaHeight(page, resolve),
      found: reader ? reader.picturesOfPage(stream, page.resources, pageIndex) : [],
    };
  });

  const infoTitle = decodeInfoTitle(raw);
  const positioned = pageTexts.some(p => p.lines.length > 0);
  const layout = positioned ? assemblePages(pageTexts.map(p => ({ lines: p.lines, height: p.height }))) : null;

  const baseText = layout ? layout.text : normalizeText(pageTexts.map(p => p.text).join('\n'));
  const rebuilt = rebuild
    ? rebuildText(baseText, { source: layout ? 'pdf' : 'plain' })
    : { content: baseText, report: { version: 0, source: 'pdf', raw: true } };

  const pictures = [];
  if (reader) {
    const decoded = new Map();
    pageTexts.flatMap(p => p.found).forEach((found) => {
      if (pictures.length >= PICTURE_LIMITS.maxCount * 2) return;
      if (!decoded.has(found.id)) {
        const small = Math.min(found.width, found.height) < PICTURE_LIMITS.minSide || found.width * found.height < PICTURE_LIMITS.minArea;
        decoded.set(found.id, small ? null : reader.decodeImage(found.obj));
      }
      const image = decoded.get(found.id);
      if (image) pictures.push({ id: found.id, pageIndex: found.pageIndex, order: found.order, ...image });
    });
  }

  return {
    pictures,
    pageRatios: layout?.pageRatios || null,
    pages: pages.length || 1,
    title: /^[\x20-\x7EÀ-ÿ‘’“”–—…]{3,}$/.test(infoTitle) ? infoTitle : null,
    text: rebuilt.content,
    rebuild: { ...rebuilt.report, layout: Boolean(layout), removed: summarizeRemoved(layout?.removed || []) },
    fontHint: dominantFont([...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([A-Za-z0-9,\-]+)/g)].map(m => m[1])),
  };
}
