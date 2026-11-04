import { inflateRaw } from 'pako';

const decoder = new TextDecoder('utf-8');

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error('O arquivo não é um EPUB válido.');

  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = {};

  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries[name] = { method, compressedSize, localOffset };
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return {
    has: name => name in entries,
    text(name) {
      const entry = entries[name];
      if (!entry) return null;
      const start = entry.localOffset + 30 + view.getUint16(entry.localOffset + 26, true) + view.getUint16(entry.localOffset + 28, true);
      const raw = bytes.subarray(start, start + entry.compressedSize);
      if (entry.method === 0) return decoder.decode(raw);
      if (entry.method === 8) return decoder.decode(inflateRaw(raw));
      throw new Error('O EPUB usa um tipo de compactação não suportado.');
    },
  };
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\s*=\s*["']([^"']*)["']`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

function resolvePath(base, href) {
  const parts = (base + href.split('#')[0]).split('/');
  const out = [];
  parts.forEach((part) => {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(decodeURIComponent(part));
  });
  return out.join('/');
}

function htmlToText(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html;
  const text = body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function headingOf(html) {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  const text = match ? htmlToText(match[1]).replace(/\s+/g, ' ') : '';
  return text.length > 0 && text.length <= 80 ? text : null;
}

export function parseEpub(bytes) {
  const zip = readZip(bytes);

  const container = zip.text('META-INF/container.xml');
  const rootTag = (container?.match(/<rootfile[^>]*>/gi) || []).find(tag => tag.toLowerCase().startsWith('<rootfiles') === false);
  const opfPath = rootTag && attr(rootTag, 'full-path');
  if (!opfPath) throw new Error('O arquivo não é um EPUB válido.');

  const opf = zip.text(opfPath);
  if (!opf) throw new Error('O arquivo não é um EPUB válido.');
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  const manifest = {};
  (opf.match(/<item\b[^>]*>/gi) || []).forEach((tag) => {
    const id = attr(tag, 'id');
    if (id) manifest[id] = { href: attr(tag, 'href'), type: attr(tag, 'media-type') || '' };
  });

  const title = decodeEntities(opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1] || '').trim();
  const author = decodeEntities(opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1] || '').trim();

  const chapters = [];
  (opf.match(/<itemref\b[^>]*>/gi) || []).forEach((tag) => {
    const item = manifest[attr(tag, 'idref')];
    if (!item?.href || !/x?html/i.test(item.type)) return;

    const html = zip.text(resolvePath(base, item.href));
    if (!html) return;

    const content = htmlToText(html);
    if (content.length < 40) return;

    chapters.push({ title: headingOf(html) || `Capítulo ${chapters.length + 1}`, content });
  });

  if (chapters.length === 0) throw new Error('Não foi possível extrair texto deste EPUB.');
  return { title, author, chapters };
}
