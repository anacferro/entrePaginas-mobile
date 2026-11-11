import { readZip } from '../zip.js';
import { newDoc, decodeEntities, BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE, stripMarks } from '../model.js';

const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

function isOn(tag) {
  const value = attr(tag, 'w:val');
  return value === null || !/^(0|false|off)$/i.test(value);
}

function mergeMarks(text) {
  return text
    .replace(/\u0002(\s*)\u0001/g, '$1')
    .replace(/\u0004(\s*)\u0003/g, '$1');
}

function runText(runXml, ctx) {
  const props = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] || '';
  const bold = /<w:b(?:\s[^>]*)?\/?>/.test(props) && isOn(props.match(/<w:b(?:\s[^>]*)?\/?>/)[0]);
  const italic = /<w:i(?:\s[^>]*)?\/?>/.test(props) && isOn(props.match(/<w:i(?:\s[^>]*)?\/?>/)[0]);
  const font = props.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/)?.[1];
  if (font) ctx.fonts.add(font);

  let out = '';
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br(?:\s[^>]*)?\/>|<w:noBreakHyphen\s*\/>|<w:footnoteReference\s[^>]*\/>|<w:endnoteReference\s[^>]*\/>/g;
  let m;
  while ((m = re.exec(runXml))) {
    const token = m[0];
    if (m[1] !== undefined) out += decodeEntities(m[1]);
    else if (token.startsWith('<w:tab')) out += '\t';
    else if (token.startsWith('<w:br')) {
      if (!/w:type="page"/.test(token)) out += '\n';
    } else if (token.startsWith('<w:noBreakHyphen')) out += '-';
    else {
      const id = attr(token, 'w:id');
      const note = ctx.noteIndex(token.startsWith('<w:endnote') ? 'end' : 'foot', id);
      if (note) out += `[${note}]`;
    }
  }
  if (!out) return '';
  if (bold) out = `${BOLD_OPEN}${out}${BOLD_CLOSE}`;
  if (italic) out = `${ITALIC_OPEN}${out}${ITALIC_CLOSE}`;
  return out;
}

function paragraphText(xml, ctx) {
  const runs = xml.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g) || [];
  return mergeMarks(runs.map((r) => runText(r, ctx)).join(''));
}

function styleMap(zip) {
  const map = {};
  const xml = zip.text('word/styles.xml') || '';
  (xml.match(/<w:style\b[^>]*w:type="paragraph"[\s\S]*?<\/w:style>/g) || []).forEach((block) => {
    const id = attr(block.match(/<w:style\b[^>]*>/)[0], 'w:styleId');
    const name = attr(block.match(/<w:name\b[^>]*>/)?.[0] || '', 'w:val') || id;
    const outline = block.match(/<w:outlineLvl\s+w:val="(\d)"/)?.[1];
    if (id) map[id] = { name: name || '', outline: outline === undefined ? null : Number(outline) };
  });
  return map;
}

function orderedMap(zip) {
  const xml = zip.text('word/numbering.xml') || '';
  const abstract = {};
  (xml.match(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g) || []).forEach((block) => {
    const id = attr(block.match(/<w:abstractNum\b[^>]*>/)[0], 'w:abstractNumId');
    const fmt = block.match(/<w:numFmt\s+w:val="([^"]+)"/)?.[1];
    abstract[id] = fmt ? fmt !== 'bullet' : false;
  });
  const map = {};
  (xml.match(/<w:num\b[\s\S]*?<\/w:num>/g) || []).forEach((block) => {
    const id = attr(block.match(/<w:num\b[^>]*>/)[0], 'w:numId');
    const abs = block.match(/<w:abstractNumId\s+w:val="(\d+)"/)?.[1];
    map[id] = abs !== undefined ? Boolean(abstract[abs]) : false;
  });
  return map;
}

function relationships(zip) {
  const map = {};
  const xml = zip.text('word/_rels/document.xml.rels') || '';
  (xml.match(/<Relationship\b[^>]*>/g) || []).forEach((tag) => {
    const id = attr(tag, 'Id');
    const target = attr(tag, 'Target');
    if (id && target) map[id] = target;
  });
  return map;
}

function notesOf(zip, part, tag) {
  const xml = zip.text(`word/${part}.xml`) || '';
  const notes = {};
  (xml.match(new RegExp(`<w:${tag}\\b[\\s\\S]*?<\\/w:${tag}>`, 'g')) || []).forEach((block) => {
    const head = block.match(new RegExp(`<w:${tag}\\b[^>]*>`))[0];
    if (/w:type="(separator|continuationSeparator|continuationNotice)"/.test(head)) return;
    const id = attr(head, 'w:id');
    const text = (block.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || [])
      .map((p) => stripMarks(paragraphText(p, { fonts: new Set(), noteIndex: () => null })).trim())
      .filter(Boolean)
      .join(' ');
    if (id && text) notes[id] = text;
  });
  return notes;
}

export function readDocx(bytes) {
  const zip = readZip(bytes);
  const documentXml = zip.text('word/document.xml');
  if (!documentXml) throw new Error('O arquivo não tem o conteúdo esperado de um documento do Word.');
  const doc = newDoc();
  const styles = styleMap(zip);
  const ordered = orderedMap(zip);
  const rels = relationships(zip);
  const footnotes = notesOf(zip, 'footnotes', 'footnote');
  const endnotes = notesOf(zip, 'endnotes', 'endnote');
  const fonts = new Set();
  const used = [];

  const ctx = {
    fonts,
    noteIndex(kind, id) {
      const source = kind === 'end' ? endnotes : footnotes;
      if (id === null || !source[id]) return null;
      used.push(source[id]);
      return used.length;
    },
  };

  const core = zip.text('docProps/core.xml') || '';
  doc.title = decodeEntities(core.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/)?.[1] || '').trim();
  doc.author = decodeEntities(core.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/)?.[1] || '').trim();
  doc.language = (documentXml.match(/<w:lang\s[^>]*w:val="([a-z]{2})/i)?.[1] || (zip.text('word/styles.xml') || '').match(/<w:lang\s[^>]*w:val="([a-z]{2})/i)?.[1] || 'pt').toLowerCase();

  const app = zip.text('docProps/app.xml') || '';
  const pages = Number(app.match(/<Pages>(\d+)<\/Pages>/)?.[1]);
  if (pages > 0) doc.meta.pages = pages;
  else doc.meta.pagesEstimated = true;

  const names = zip.names();
  doc.meta.macros = names.some((n) => /vbaProject\.bin$/i.test(n));
  doc.meta.charts = names.filter((n) => /^word\/charts\/chart\d+\.xml$/i.test(n)).length;
  doc.meta.headerFooter = names
    .filter((n) => /^word\/(header|footer)\d*\.xml$/i.test(n))
    .some((n) => /<w:t[\s>]/.test(zip.text(n) || ''));
  if (/<w:instrText[^>]*>\s*TOC\b/i.test(documentXml)) doc.meta.hasToc = true;
  if (names.some((n) => /^word\/embeddings\//i.test(n))) doc.meta.notes.push('O documento tem objetos incorporados (planilhas ou outros arquivos) que não são convertidos.');

  const body = documentXml.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] || documentXml;
  const tokenRe = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/w:p>)/g;
  let token;
  let unsupportedImages = 0;

  while ((token = tokenRe.exec(body))) {
    const xml = token[0];
    if (xml.startsWith('<w:tbl>')) {
      const rows = (xml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || []).map((row) =>
        (row.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map((cell) =>
          (cell.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || []).map((p) => paragraphText(p, ctx).trim()).filter(Boolean).join(' ')
        )
      ).filter((r) => r.length);
      if (rows.length) doc.blocks.push({ t: 'table', rows });
      continue;
    }

    const pPr = xml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || '';
    const styleId = attr(pPr.match(/<w:pStyle\b[^>]*>/)?.[0] || '', 'w:val');
    const style = styles[styleId] || { name: styleId || '', outline: null };
    const styleName = style.name;

    const images = [];
    if (/<w:drawing>|<w:pict>/.test(xml)) {
      const descr = decodeEntities(xml.match(/<wp:docPr\b[^>]*\bdescr="([^"]*)"/)?.[1] || '').trim();
      if (/<c:chart\b/.test(xml)) {
        images.push({ t: 'img', alt: descr || 'Gráfico', data: null, chart: true });
        if (!doc.meta.charts) doc.meta.charts = 1;
      }
      (xml.match(/r:(?:embed|id)="([^"]+)"/g) || []).forEach((ref) => {
        const target = rels[ref.match(/"([^"]+)"/)[1]];
        if (!target || /^https?:/i.test(target)) return;
        const path = target.startsWith('/') ? target.slice(1) : `word/${target}`.replace(/word\/\.\.\//, '');
        const ext = path.split('.').pop().toLowerCase();
        const mime = IMAGE_TYPES[ext];
        if (/charts?\//.test(path)) return;
        let data = null;
        if (mime && zip.has(path)) data = zip.bytes(path);
        if (!data) unsupportedImages += 1;
        images.push({ t: 'img', alt: descr, data, mime: data ? mime : null });
      });
    }

    if (/^(toc\s*\d*|toc heading|sum[aá]rio\s*\d*|table of contents)$/i.test(styleName) || /^toc/i.test(styleId || '')) {
      doc.meta.hasToc = true;
      continue;
    }

    const text = paragraphText(xml, ctx).replace(/­/g, '');
    const plain = stripMarks(text).trim();

    if (plain) {
      const heading = styleName.match(/^(?:heading|t[ií]tulo|cabe[cç]alho)\s*(\d)$/i);
      const level = heading ? Number(heading[1]) : style.outline !== null ? style.outline + 1 : pPr.match(/<w:outlineLvl\s+w:val="(\d)"/) ? Number(pPr.match(/<w:outlineLvl\s+w:val="(\d)"/)[1]) + 1 : null;
      if (/^(title|t[ií]tulo)$/i.test(styleName)) {
        doc.blocks.push({ t: 'h', level: 0, text: plain });
        if (!doc.title) doc.title = plain;
      } else if (level && level <= 6 && plain.length < 300) {
        doc.blocks.push({ t: 'h', level, text: plain.replace(/\s+/g, ' ') });
      } else if (/<w:numPr>/.test(pPr) || /^(list paragraph|par[aá]grafo da lista|list bullet|list number)/i.test(styleName)) {
        const numId = attr(pPr.match(/<w:numId\b[^>]*>/)?.[0] || '', 'w:val');
        doc.blocks.push({ t: 'li', text: text.trim(), ordered: Boolean(ordered[numId]) || /list number/i.test(styleName) });
      } else if (/^(quote|intense quote|cita[cç][aã]o|cita[cç][aã]o intensa|block text)/i.test(styleName)) {
        doc.blocks.push({ t: 'quote', text: text.trim() });
      } else {
        doc.blocks.push({ t: 'p', text: text.replace(/^[ \t]+|[ \t]+$/g, '') });
      }
    }
    images.forEach((img) => doc.blocks.push(img));
  }

  used.forEach((note, i) => doc.blocks.push({ t: 'p', text: `[${i + 1}] ${note}`, note: true }));
  doc.meta.footnotes = used.length;
  doc.meta.fonts = [...fonts, ...[...(zip.text('word/fontTable.xml') || '').matchAll(/<w:font\s+w:name="([^"]+)"/g)].map((m) => decodeEntities(m[1]))].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
  if (unsupportedImages) doc.meta.notes.push(`${unsupportedImages} imagem(ns) em formato que o app não converte (como EMF, WMF ou TIFF) ficaram só como marcação "[Imagem]".`);
  if (doc.meta.macros) doc.meta.notes.push('O documento tem macros. Elas foram ignoradas e nunca são executadas.');
  if (doc.meta.charts) doc.meta.notes.push('Gráficos do Word não são redesenhados: aparecem como "[Imagem: Gráfico]".');
  return doc;
}
