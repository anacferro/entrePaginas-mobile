import { deflate } from 'pako';
import { chaptersOf, stripMarks } from '../model.js';
import { pdfImageFor } from './pdfImages.js';

export const PDF_DEFAULTS = {
  pageSize: 'A4',
  orientation: 'portrait',
  margin: 'medium',
  fontSize: 11,
  header: true,
  footer: true,
  pageNumbers: true,
  includeToc: true,
  includeImages: true,
  justify: true,
  split: 'headings',
};

const SIZES = { A4: [595.28, 841.89], A5: [419.53, 595.28], Letter: [612, 792] };
const MARGINS = { narrow: 40, medium: 57, wide: 76 };

const ROMAN = '250 333 408 500 500 833 778 180 333 333 500 564 250 333 250 278 500 500 500 500 500 500 500 500 500 500 278 278 564 564 564 444 921 722 667 667 722 611 556 722 722 333 389 722 611 889 722 722 556 722 667 556 611 722 722 944 722 722 611 333 278 333 469 500 333 444 500 444 500 444 333 500 500 278 278 500 278 778 500 500 500 500 333 389 278 500 500 722 500 500 444 480 200 480 541'.split(' ').map(Number);
const BOLD = '250 333 555 500 500 1000 833 278 333 333 500 570 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500 930 722 667 722 722 667 611 778 778 389 500 778 667 944 722 778 611 778 722 556 667 722 722 1000 722 722 667 333 278 333 581 500 333 500 556 444 556 444 333 500 556 278 333 556 278 833 556 500 556 556 444 389 333 556 500 722 500 500 444 394 220 394 520'.split(' ').map(Number);
const ITALIC = '250 333 420 500 500 833 778 214 333 333 500 675 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 675 675 675 500 920 611 611 667 722 611 611 722 722 333 444 667 556 833 667 722 611 722 611 500 556 722 611 833 611 556 556 389 278 389 422 500 333 500 500 444 500 444 278 500 500 278 278 444 278 722 500 500 500 500 389 389 278 500 444 667 444 444 389 400 275 400 541'.split(' ').map(Number);

const WIN = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

const FONTS = { r: 'F1', b: 'F2', i: 'F3', bi: 'F4' };
const BASE_FONTS = { F1: 'Times-Roman', F2: 'Times-Bold', F3: 'Times-Italic', F4: 'Times-BoldItalic' };

function styleKey(s) {
  return `${s.bold ? 'b' : ''}${s.italic ? 'i' : ''}` || 'r';
}

function charWidth(code, style) {
  const table = style === 'r' ? ROMAN : style === 'i' ? ITALIC : BOLD;
  if (code >= 32 && code <= 126) return table[code - 32];
  if (code === 0xa0) return 250;
  if (code === 0x97) return 1000;
  if (code === 0x85) return 1000;
  if (code === 0x95) return 350;
  if (code === 0x96) return 500;
  if (code >= 0xc0) {
    const base = String.fromCharCode(code).normalize('NFD')[0].charCodeAt(0);
    if (base >= 32 && base <= 126 && base !== code) return table[base - 32];
  }
  return 500;
}

function encode(text, counter) {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0x2011) out += '-';
    else if (cp === 0xad || cp === 0x200b || cp === 0xfeff) continue;
    else if (WIN[cp]) out += String.fromCharCode(WIN[cp]);
    else if (cp >= 32 && cp <= 255 && !(cp >= 0x80 && cp <= 0x9f)) out += ch;
    else if (cp === 9) out += '    ';
    else if (/\s/.test(ch)) out += ' ';
    else {
      out += '?';
      counter.n += 1;
      if (counter.sample.length < 8 && !counter.sample.includes(ch)) counter.sample.push(ch);
    }
  }
  return out;
}

function widthOf(text, style, size) {
  let w = 0;
  for (let i = 0; i < text.length; i += 1) w += charWidth(text.charCodeAt(i), style);
  return (w * size) / 1000;
}

function pdfStr(text) {
  let out = '(';
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c === 40 || c === 41 || c === 92) out += `\\${text[i]}`;
    else if (c < 32 || c > 126) out += `\\${c.toString(8).padStart(3, '0')}`;
    else out += text[i];
  }
  return `${out})`;
}

function utf16Hex(text) {
  let hex = 'FEFF';
  for (let i = 0; i < text.length; i += 1) hex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
}

function toWords(text, counter) {
  const words = [];
  let style = { bold: false, italic: false };
  let buffer = '';
  const pushBuffer = () => {
    if (buffer) words.push({ t: buffer, style: styleKey(style) });
    buffer = '';
  };
  const parts = String(text).split(/([\u0001-\u0004]|\n)/);
  parts.forEach((part) => {
    if (part === '\u0001') {
      pushBuffer();
      style = { ...style, bold: true };
    } else if (part === '\u0002') {
      pushBuffer();
      style = { ...style, bold: false };
    } else if (part === '\u0003') {
      pushBuffer();
      style = { ...style, italic: true };
    } else if (part === '\u0004') {
      pushBuffer();
      style = { ...style, italic: false };
    } else if (part === '\n') {
      pushBuffer();
      words.push({ br: true });
    } else {
      encode(part, counter).split(/(\s+)/).forEach((piece) => {
        if (!piece) return;
        if (/^\s+$/.test(piece)) {
          pushBuffer();
          words.push({ gap: true, style: styleKey(style) });
        } else {
          pushBuffer();
          words.push({ t: piece, style: styleKey(style) });
        }
      });
    }
  });
  pushBuffer();
  return words.filter((w, i, a) => !(w.gap && (i === 0 || a[i - 1].gap || a[i - 1].br)));
}

function wrap(words, avail, size, firstIndent = 0, stats) {
  const lines = [];
  let line = { items: [], width: 0 };
  let limit = avail - firstIndent;
  const flushLine = (hard = false) => {
    while (line.items.length && line.items[line.items.length - 1].gap) {
      line.width -= line.items[line.items.length - 1].w;
      line.items.pop();
    }
    lines.push({ ...line, hard, indent: lines.length === 0 ? firstIndent : 0 });
    line = { items: [], width: 0 };
    limit = avail;
  };
  words.forEach((w) => {
    if (w.br) {
      flushLine(true);
      return;
    }
    if (w.gap) {
      if (line.items.length) {
        const gw = widthOf(' ', w.style, size);
        line.items.push({ ...w, t: ' ', w: gw });
        line.width += gw;
      }
      return;
    }
    let text = w.t;
    let ww = widthOf(text, w.style, size);
    while (ww > limit && line.items.length === 0 && text.length > 1) {
      let cut = text.length - 1;
      while (cut > 1 && widthOf(text.slice(0, cut), w.style, size) > limit) cut -= 1;
      line.items.push({ t: text.slice(0, cut), style: w.style, w: widthOf(text.slice(0, cut), w.style, size) });
      line.width += line.items[0].w;
      stats.splitWords += 1;
      flushLine();
      text = text.slice(cut);
      ww = widthOf(text, w.style, size);
    }
    if (line.width + ww > limit + 0.01 && line.items.length) flushLine();
    line.items.push({ t: text, style: w.style, w: ww });
    line.width += ww;
  });
  if (line.items.length || lines.length === 0) flushLine(true);
  return lines;
}

export function buildPdf(doc, options = {}) {
  const o = { ...PDF_DEFAULTS, ...options };
  const [bw, bh] = SIZES[o.pageSize] || SIZES.A4;
  const [W, H] = o.orientation === 'landscape' ? [bh, bw] : [bw, bh];
  const M = MARGINS[o.margin] || MARGINS.medium;
  const size = Math.min(16, Math.max(8, Number(o.fontSize) || 11));
  const headerSpace = o.header ? 18 : 0;
  const footerSpace = o.footer || o.pageNumbers ? 20 : 0;
  const top = M + headerSpace;
  const bottom = H - M - footerSpace;
  const left = M;
  const avail = W - 2 * M;
  const title = o.title || doc.title || 'Livro convertido';
  const counter = { n: 0, sample: [] };
  const stats = { splitWords: 0, wideTables: 0, imagesSkipped: 0, imagesUnsupported: 0 };
  const warnings = [];
  const xobjects = [];
  const chapters = chaptersOf(doc, { split: o.split });

  const newPage = () => ({ ops: [], lines: [], images: new Set() });
  let page = newPage();
  const bodyPages = [page];
  let y = top;
  const chapterStart = [];

  const emitLine = (pg, x, baseY, line, fontSize, justify) => {
    const items = line.items;
    if (!items.length) return;
    let ops = 'BT\n';
    let spaces = 0;
    items.forEach((it) => {
      if (it.t === ' ') spaces += 1;
    });
    const natural = line.width;
    const target = line.maxWidth;
    let tw = 0;
    if (justify && !line.hard && spaces > 0 && target && natural < target) tw = (target - natural) / spaces;
    if (tw > fontSize * 0.7) tw = 0;
    let first = true;
    let group = [];
    let current = null;
    const pushGroup = () => {
      if (!group.length) return;
      const text = group.join('');
      ops += `/${FONTS[current]} ${fontSize.toFixed(2)} Tf\n`;
      if (first) {
        ops += `${x.toFixed(2)} ${(H - baseY).toFixed(2)} Td\n`;
        first = false;
      }
      ops += `${tw ? `${tw.toFixed(3)} Tw\n` : ''}${pdfStr(text)} Tj\n`;
      group = [];
    };
    items.forEach((it) => {
      const st = it.style || current || 'r';
      if (current === null) current = st;
      if (st !== current && it.t !== ' ') {
        pushGroup();
        current = st;
      }
      group.push(it.t);
    });
    pushGroup();
    ops += tw ? '0 Tw\n' : '';
    ops += 'ET\n';
    pg.ops.push(ops);
    if (pg.lines.length < 70) pg.lines.push({ x, y: baseY, text: stripMarks(items.map((i) => i.t).join('')), size: fontSize, bold: items.some((i) => /b/.test(i.style || '')) });
  };

  const ensure = (height) => {
    if (y + height > bottom && y > top + 1) {
      page = newPage();
      bodyPages.push(page);
      y = top;
    }
  };

  const textBlock = ({ text, fontSize = size, indent = 0, firstIndent = 0, before = 0, after = size * 0.55, justify = o.justify, forceStyle = null, keepNext = false }) => {
    let words = toWords(text, counter);
    if (forceStyle) words = words.map((w) => (w.style ? { ...w, style: forceStyle } : w));
    const lines = wrap(words, avail - indent, fontSize, firstIndent, stats).map((l, i) => ({ ...l, maxWidth: avail - indent - (i === 0 ? firstIndent : 0) }));
    const lh = fontSize * 1.38;
    if (y > top + 1) y += before;
    ensure(lh * (keepNext ? Math.min(lines.length, 2) + 2 : Math.min(lines.length, 2)));
    lines.forEach((line) => {
      ensure(lh);
      emitLine(page, left + indent + line.indent, y + fontSize, line, fontSize, justify);
      y += lh;
    });
    y += after;
  };

  const drawImage = (block) => {
    let img = null;
    if (block.data && o.includeImages) img = pdfImageFor(block.mime, block.data);
    if (!img) {
      if (block.data && !o.includeImages) stats.imagesSkipped += 1;
      else if (block.data) stats.imagesUnsupported += 1;
      textBlock({ text: block.alt ? `[Imagem: ${block.alt}]` : '[Imagem]', justify: false, forceStyle: 'i' });
      return;
    }
    let w = Math.min(avail, (img.width * 72) / 96);
    let h = (w * img.height) / img.width;
    const maxH = (bottom - top) * 0.85;
    if (h > maxH) {
      h = maxH;
      w = (h * img.width) / img.height;
    }
    ensure(h + 8);
    const name = `Im${xobjects.length + 1}`;
    xobjects.push({ name, img });
    page.images.add(name);
    page.ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${(left + (avail - w) / 2).toFixed(2)} ${(H - y - h).toFixed(2)} cm /${name} Do Q\n`);
    y += h + 8;
  };

  const drawTable = (block) => {
    const cols = Math.max(...block.rows.map((r) => r.length));
    const fs = cols >= 8 ? 6.5 : cols >= 6 ? 7.5 : Math.max(7.5, size - 2);
    if (cols >= 6) stats.wideTables += 1;
    const cw = avail / cols;
    const pad = 3;
    block.rows.forEach((row) => {
      const cellLines = Array.from({ length: cols }, (_, c) =>
        wrap(toWords(row[c] || '', counter), cw - 2 * pad, fs, 0, stats)
      );
      const rows = Math.max(...cellLines.map((l) => l.length));
      const rh = rows * fs * 1.3 + 2 * pad;
      ensure(rh);
      cellLines.forEach((lines, c) => {
        lines.forEach((line, li) => emitLine(page, left + c * cw + pad, y + pad + fs + li * fs * 1.3, { ...line, hard: true }, fs, false));
        page.ops.push(`0.5 w ${(left + c * cw).toFixed(2)} ${(H - y - rh).toFixed(2)} ${cw.toFixed(2)} ${rh.toFixed(2)} re S\n`);
      });
      y += rh;
    });
    y += size * 0.8;
  };

  chapters.forEach((chapter, ci) => {
    if (ci > 0 && y > top + 1) {
      page = newPage();
      bodyPages.push(page);
      y = top;
    }
    chapterStart.push({ title: chapter.title, page: bodyPages.length - 1 });
    textBlock({ text: chapter.title, fontSize: size * 1.8, forceStyle: 'b', justify: false, before: 0, after: size * 1.2, keepNext: true });
    let ordinal = 0;
    chapter.blocks.forEach((block) => {
      if (block.t !== 'li') ordinal = 0;
      if (block.t === 'h') {
        const scale = block.level <= 1 ? 1.5 : block.level === 2 ? 1.3 : block.level === 3 ? 1.15 : 1.05;
        textBlock({ text: stripMarks(block.text), fontSize: size * scale, forceStyle: 'b', justify: false, before: size * 0.9, after: size * 0.45, keepNext: true });
      } else if (block.t === 'li') {
        ordinal = block.ordered ? ordinal + 1 : 0;
        textBlock({ text: `${block.ordered ? `${ordinal}.` : '•'}\t${block.text}`.replace('\t', ' '), indent: 16, firstIndent: -12, after: size * 0.2, justify: false });
      } else if (block.t === 'quote') textBlock({ text: block.text, indent: 24, forceStyle: 'i', after: size * 0.7, before: size * 0.3, justify: false });
      else if (block.t === 'pre') textBlock({ text: block.text, justify: false, indent: 12, after: size * 0.7, before: size * 0.3 });
      else if (block.t === 'table') drawTable(block);
      else if (block.t === 'img') drawImage(block);
      else if (block.note) textBlock({ text: block.text, fontSize: size * 0.88, justify: false, after: size * 0.3 });
      else textBlock({ text: block.text, firstIndent: size * 1.4 });
    });
  });

  const tocLinesPerPage = Math.max(8, Math.floor((bottom - top) / (size * 1.8)) - 2);
  const tocPageCount = o.includeToc && chapters.length > 1 ? Math.ceil(chapters.length / tocLinesPerPage) : 0;
  const coverCount = 1;
  const offset = coverCount + tocPageCount;

  const cover = newPage();
  const coverStats = { splitWords: 0 };
  const coverLines = wrap(toWords(title, counter).map((w) => (w.style ? { ...w, style: 'b' } : w)), avail, size * 2.4, 0, coverStats).map((l) => ({ ...l, hard: true }));
  let cy = H * 0.34;
  coverLines.forEach((l) => {
    emitLine(cover, left + (avail - l.width) / 2, cy, l, size * 2.4, false);
    cy += size * 3.2;
  });
  if (doc.author) {
    const authorLine = wrap(toWords(doc.author, counter), avail, size * 1.3, 0, coverStats)[0];
    emitLine(cover, left + (avail - authorLine.width) / 2, cy + size, { ...authorLine, hard: true }, size * 1.3, false);
  }
  cover.lines.forEach((l) => {
    l.bold = true;
  });

  const tocPages = [];
  if (tocPageCount) {
    for (let p = 0; p < tocPageCount; p += 1) {
      const tp = newPage();
      let ty = top;
      if (p === 0) {
        const head = wrap(toWords('Sumário', counter), avail, size * 1.6, 0, coverStats)[0];
        emitLine(tp, left, ty + size * 1.6, { ...head, items: head.items.map((i) => ({ ...i, style: 'b' })), hard: true }, size * 1.6, false);
        ty += size * 3;
      }
      chapterStart.slice(p * tocLinesPerPage, (p + 1) * tocLinesPerPage).forEach((entry) => {
        const label = wrap(toWords(entry.title, counter), avail - 40, size, 0, coverStats)[0];
        emitLine(tp, left, ty + size, { ...label, hard: true }, size, false);
        const num = String(entry.page + offset + 1);
        const numW = widthOf(num, 'r', size);
        const dots = Math.max(0, Math.floor((avail - label.width - numW - 12) / widthOf('.', 'r', size)));
        tp.ops.push(`BT\n/F1 ${size.toFixed(2)} Tf\n${(left + label.width + 6).toFixed(2)} ${(H - ty - size).toFixed(2)} Td\n${pdfStr('.'.repeat(dots))} Tj\nET\n`);
        tp.ops.push(`BT\n/F1 ${size.toFixed(2)} Tf\n${(left + avail - numW).toFixed(2)} ${(H - ty - size).toFixed(2)} Td\n${pdfStr(num)} Tj\nET\n`);
        ty += size * 1.8;
      });
      tocPages.push(tp);
    }
  }

  const allPages = [cover, ...tocPages, ...bodyPages];
  const total = allPages.length;
  allPages.forEach((pg, i) => {
    if (i === 0) return;
    if (o.header) {
      const text = encode(title, counter).slice(0, 90);
      const w = widthOf(text, 'i', size * 0.8);
      pg.ops.push(`BT\n/F3 ${(size * 0.8).toFixed(2)} Tf\n${(left + (avail - w) / 2).toFixed(2)} ${(H - M + 6).toFixed(2)} Td\n${pdfStr(text)} Tj\nET\n`);
    }
    if (o.pageNumbers) {
      const label = `${i + 1}`;
      const w = widthOf(label, 'r', size * 0.9);
      pg.ops.push(`BT\n/F1 ${(size * 0.9).toFixed(2)} Tf\n${(left + (avail - w) / 2).toFixed(2)} ${(M - 6).toFixed(2)} Td\n${pdfStr(label)} Tj\nET\n`);
    }
  });

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const stream = (dict, data) => {
    const bytes = typeof data === 'string' ? Uint8Array.from(data, (c) => c.charCodeAt(0) & 255) : data;
    return { dict, bytes };
  };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(null);
  const fontRefs = {};
  Object.entries(BASE_FONTS).forEach(([key, name]) => {
    fontRefs[key] = add(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`);
  });
  add(`<< /Title ${utf16Hex(title)} ${doc.author ? `/Author ${utf16Hex(doc.author)} ` : ''}/Producer ${utf16Hex('Entre Páginas')} >>`);
  const imageRefs = {};
  xobjects.forEach((x) => {
    imageRefs[x.name] = add(stream(`${x.img.dict} /Length ${x.img.data.length}`, x.img.data));
  });
  const pageRefs = [];
  allPages.forEach((pg) => {
    const content = deflate(Uint8Array.from(pg.ops.join(''), (c) => c.charCodeAt(0) & 255));
    const contentRef = add(stream(`/Length ${content.length} /Filter /FlateDecode`, content));
    const images = [...pg.images].map((n) => `/${n} ${imageRefs[n]} 0 R`).join(' ');
    const fonts = Object.entries(fontRefs).map(([k, r]) => `/${k} ${r} 0 R`).join(' ');
    pageRefs.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Contents ${contentRef} 0 R /Resources << /Font << ${fonts} >>${images ? ` /XObject << ${images} >>` : ''} >> >>`));
  });
  objects[1] = `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((r) => `${r} 0 R`).join(' ')}] >>`;

  const chunks = [];
  let length = 0;
  const push = (data) => {
    const bytes = typeof data === 'string' ? Uint8Array.from(data, (c) => c.charCodeAt(0) & 255) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  push('%PDF-1.4\n%âãÏÓ\n');
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(length);
    push(`${i + 1} 0 obj\n`);
    if (typeof obj === 'string') push(`${obj}\n`);
    else {
      push(`<< ${obj.dict} >>\nstream\n`);
      push(obj.bytes);
      push('\nendstream\n');
    }
    push('endobj\n');
  });
  const xref = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((off) => `${String(off).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const bytes = new Uint8Array(length);
  let at = 0;
  chunks.forEach((c) => {
    bytes.set(c, at);
    at += c.length;
  });

  if (counter.n) warnings.push(`${counter.n} caractere(s) fora do alfabeto latino do PDF (como ${counter.sample.join(' ')}) foram trocados por "?". Prefira EPUB para esse texto.`);
  if (stats.wideTables) warnings.push(`${stats.wideTables} tabela(s) larga(s) tiveram a fonte reduzida para caber na página.`);
  if (stats.imagesUnsupported) warnings.push(`${stats.imagesUnsupported} imagem(ns) em formato que o PDF do app não incorpora (só PNG sem entrelaçamento e JPEG) ficaram como "[Imagem]".`);
  if (stats.imagesSkipped) warnings.push(`${stats.imagesSkipped} imagem(ns) ficaram de fora porque você desmarcou a inclusão de imagens.`);
  if (stats.splitWords) warnings.push(`${stats.splitWords} palavra(s) maiores que a linha foram quebradas para não serem cortadas.`);

  return {
    format: 'pdf',
    bytes,
    mime: 'application/pdf',
    extension: 'pdf',
    pages: total,
    chapters: chapters.length,
    imagesIncluded: xobjects.length,
    toc: chapterStart.map((c) => c.title),
    preview: { width: W, height: H, margin: M, pages: allPages.slice(0, 4).map((p) => p.lines) },
    warnings,
    options: o,
    nonLatin: counter.n,
  };
}
