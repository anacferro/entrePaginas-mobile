import { inflateRaw } from 'pako';
import { dominantFont } from './fontHints';

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
    bytes(name) {
      const entry = entries[name];
      if (!entry) return null;
      const start = entry.localOffset + 30 + view.getUint16(entry.localOffset + 26, true) + view.getUint16(entry.localOffset + 28, true);
      const raw = bytes.subarray(start, start + entry.compressedSize);
      if (entry.method === 0) return raw.slice();
      if (entry.method === 8) return inflateRaw(raw);
      return null;
    },
  };
}

function sha1(data) {
  const words = [];
  for (let i = 0; i < data.length; i += 1) words[i >> 2] |= data[i] << (24 - (i % 4) * 8);
  const bitLength = data.length * 8;
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Array(80);
  const rotl = (n, b) => (n << b) | (n >>> (32 - b));

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 80; t += 1) {
      w[t] = t < 16 ? words[i + t] | 0 : rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    }
    let a = h0;
    let b = h1;
    let cc = h2;
    let d = h3;
    let e = h4;
    for (let t = 0; t < 80; t += 1) {
      const [f, k] =
        t < 20 ? [(b & cc) | (~b & d), 0x5a827999] :
        t < 40 ? [b ^ cc ^ d, 0x6ed9eba1] :
        t < 60 ? [(b & cc) | (b & d) | (cc & d), 0x8f1bbcdc] :
        [b ^ cc ^ d, 0xca62c1d6];
      const temp = (rotl(a, 5) + f + e + k + w[t]) | 0;
      e = d;
      d = cc;
      cc = rotl(b, 30);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + cc) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const out = new Uint8Array(20);
  [h0, h1, h2, h3, h4].forEach((h, i) => {
    out[i * 4] = h >>> 24;
    out[i * 4 + 1] = (h >>> 16) & 255;
    out[i * 4 + 2] = (h >>> 8) & 255;
    out[i * 4 + 3] = h & 255;
  });
  return out;
}

function deobfuscate(data, algorithm, identifier) {
  const idpf = /idpf\.org\/2008\/embedding/i.test(algorithm);
  const adobe = /adobe\.com\/pdf\/enc/i.test(algorithm);
  if (!idpf && !adobe) return data;

  let key;
  let span;
  if (idpf) {
    key = sha1(new TextEncoder().encode(identifier.replace(/\s/g, '')));
    span = 1040;
  } else {
    const hex = identifier.replace(/^urn:uuid:/i, '').replace(/-/g, '');
    if (hex.length < 32) return data;
    key = Uint8Array.from({ length: 16 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
    span = 1024;
  }

  const out = data.slice();
  for (let i = 0; i < Math.min(span, out.length); i += 1) out[i] ^= key[i % key.length];
  return out;
}

function cssFontFaces(zip, manifest, base) {
  const faces = [];
  Object.values(manifest).forEach((item) => {
    if (!/css/i.test(item.type) || !item.href) return;
    const cssPath = resolvePath(base, item.href);
    const css = zip.text(cssPath);
    if (!css) return;
    const cssBase = cssPath.includes('/') ? cssPath.slice(0, cssPath.lastIndexOf('/') + 1) : '';
    (css.match(/@font-face\s*\{[^}]*\}/gi) || []).forEach((block) => {
      const family = block.match(/font-family\s*:\s*["']?([^;"']+)/i)?.[1]?.trim();
      const url = block.match(/url\(\s*["']?([^)"']+)["']?\s*\)/i)?.[1];
      if (!family || !url) return;
      faces.push({
        family,
        path: resolvePath(cssBase, url),
        italic: /font-style\s*:\s*(italic|oblique)/i.test(block),
        bold: /font-weight\s*:\s*(bold|[6-9]00)/i.test(block),
      });
    });
  });
  return faces;
}

function bodyFamilies(zip, manifest, base) {
  const names = [];
  Object.values(manifest).forEach((item) => {
    if (!/css/i.test(item.type) || !item.href) return;
    const css = zip.text(resolvePath(base, item.href)) || '';
    (css.match(/(?:^|[}\s])(?:body|html|p)\s*\{[^}]*\}/gi) || []).forEach((rule) => {
      const list = rule.match(/font-family\s*:\s*([^;}]+)/i)?.[1];
      if (list) names.push(...list.split(',').map(n => n.replace(/["']/g, '').trim()));
    });
  });
  return names;
}

function extractFont(zip, manifest, base, opf) {
  const encryption = zip.text('META-INF/encryption.xml') || '';
  const algorithms = {};
  (encryption.match(/<(?:enc:)?EncryptedData[\s\S]*?<\/(?:enc:)?EncryptedData>/gi) || []).forEach((block) => {
    const algorithm = block.match(/Algorithm\s*=\s*["']([^"']+)["']/i)?.[1];
    const uri = block.match(/<(?:enc:)?CipherReference[^>]*URI\s*=\s*["']([^"']+)["']/i)?.[1];
    if (algorithm && uri) algorithms[decodeURIComponent(uri)] = algorithm;
  });

  const uidRef = opf.match(/<package[^>]*unique-identifier\s*=\s*["']([^"']+)["']/i)?.[1];
  const idTag = (opf.match(/<dc:identifier[^>]*>[\s\S]*?<\/dc:identifier>/gi) || []).find(tag => !uidRef || attr(tag, 'id') === uidRef);
  const identifier = decodeEntities((idTag || '').replace(/<[^>]+>/g, '')).trim();

  const faces = cssFontFaces(zip, manifest, base).filter(f => /\.(ttf|otf)$/i.test(f.path));
  const wanted = bodyFamilies(zip, manifest, base).map(n => n.toLowerCase());
  const regular = faces.filter(f => !f.italic && !f.bold);
  const pool = regular.length ? regular : faces;
  const chosen = pool.find(f => wanted.includes(f.family.toLowerCase())) || pool[0];
  if (!chosen) return null;

  const data = zip.bytes(chosen.path);
  if (!data) return null;
  const fixed = deobfuscate(data, algorithms[chosen.path] || algorithms[chosen.path.replace(base, '')] || '', identifier);
  const head = (fixed[0] << 24) | (fixed[1] << 16) | (fixed[2] << 8) | fixed[3];
  const valid = head === 0x00010000 || head === 0x4f54544f || head === 0x74727565;
  return valid ? { family: chosen.family, ext: /\.otf$/i.test(chosen.path) ? 'otf' : 'ttf', bytes: fixed } : null;
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
  let font = null;
  try {
    font = extractFont(zip, manifest, base, opf);
  } catch {
    font = null;
  }
  const fontHint = dominantFont([font?.family, ...bodyFamilies(zip, manifest, base)].filter(Boolean));
  return { title, author, chapters, font, fontHint };
}
