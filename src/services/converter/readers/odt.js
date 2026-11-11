import { readZip } from '../zip.js';
import { newDoc, decodeEntities, BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE, stripMarks } from '../model.js';

const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

function spanStyles(xml) {
  const styles = {};
  (xml.match(/<style:style\b[^>]*style:family="text"[\s\S]*?<\/style:style>/g) || []).forEach((block) => {
    const name = attr(block.match(/<style:style\b[^>]*>/)[0], 'style:name');
    const props = block.match(/<style:text-properties\b[^>]*>/)?.[0] || '';
    styles[name] = {
      bold: /fo:font-weight="bold"/.test(props),
      italic: /fo:font-style="italic"/.test(props),
    };
  });
  return styles;
}

function inline(xml, styles, ctx) {
  let out = '';
  const stack = [];
  const re = /<text:span\b[^>]*>|<\/text:span>|<text:s(?:\s[^>]*)?\/>|<text:tab\s*\/>|<text:line-break\s*\/>|<text:note-x\b[^>]*\/>|<[^>]+>|[^<]+/g;
  let m;
  while ((m = re.exec(xml))) {
    const token = m[0];
    if (token.startsWith('<text:span')) {
      const style = styles[attr(token, 'text:style-name')] || {};
      stack.push(style);
      if (style.bold) out += BOLD_OPEN;
      if (style.italic) out += ITALIC_OPEN;
    } else if (token === '</text:span>') {
      const style = stack.pop() || {};
      if (style.italic) out += ITALIC_CLOSE;
      if (style.bold) out += BOLD_CLOSE;
    } else if (token.startsWith('<text:s')) {
      out += ' '.repeat(Number(attr(token, 'text:c')) || 1);
    } else if (token.startsWith('<text:tab')) out += '\t';
    else if (token.startsWith('<text:line-break')) out += '\n';
    else if (token.startsWith('<text:note-x')) {
      const text = ctx.pending[Number(attr(token, 'n'))];
      if (text) {
        ctx.notes.push(text);
        out += `[${ctx.notes.length}]`;
      }
    } else if (token.startsWith('<')) continue;
    else out += decodeEntities(token);
  }
  return out.replace(/\u0002\u0001/g, '').replace(/\u0004\u0003/g, '');
}

export function readOdt(bytes) {
  const zip = readZip(bytes);
  const content = zip.text('content.xml');
  if (!content) throw new Error('O arquivo não tem o conteúdo esperado de um documento OpenDocument.');
  const doc = newDoc();
  const styles = spanStyles(content);
  const ctx = { notes: [], pending: [] };

  const meta = zip.text('meta.xml') || '';
  doc.title = decodeEntities(meta.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/)?.[1] || '').trim();
  doc.author = decodeEntities(meta.match(/<(?:dc:creator|meta:initial-creator)[^>]*>([\s\S]*?)<\/(?:dc:creator|meta:initial-creator)>/)?.[1] || '').trim();
  doc.language = (meta.match(/<dc:language[^>]*>([a-z]{2})/i)?.[1] || content.match(/fo:language="([a-z]{2})"/)?.[1] || 'pt').toLowerCase();
  const pages = Number(meta.match(/meta:page-count="(\d+)"/)?.[1]);
  if (pages > 0) doc.meta.pages = pages;
  else doc.meta.pagesEstimated = true;

  const names = zip.names();
  doc.meta.macros = names.some((n) => /^(Basic|Scripts)\//i.test(n));
  const fonts = [...content.matchAll(/<style:font-face\b[^>]*style:name="([^"]+)"/g)].map((m) => decodeEntities(m[1]));
  doc.meta.fonts = fonts.filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
  doc.meta.headerFooter = /<style:(header|footer)\b/.test(zip.text('styles.xml') || '') && /<style:(header|footer)\b[\s\S]*?<text:p/.test(zip.text('styles.xml') || '');

  const bodyRaw = content.match(/<office:text\b[^>]*>([\s\S]*)<\/office:text>/)?.[1] || '';
  const body = bodyRaw.replace(/<text:note\b[\s\S]*?<\/text:note>/g, (note) => {
    const inner = note.match(/<text:note-body>([\s\S]*?)<\/text:note-body>/)?.[1] || '';
    ctx.pending.push(stripMarks(inline(inner, styles, { notes: [], pending: [] })).replace(/\s+/g, ' ').trim());
    return `<text:note-x n="${ctx.pending.length - 1}"/>`;
  });
  const tokenRe = /<text:table-of-content\b[\s\S]*?<\/text:table-of-content>|<table:table\b[\s\S]*?<\/table:table>|<text:list\b[\s\S]*?<\/text:list>|<text:h\b[\s\S]*?<\/text:h>|<text:p\b[^>]*\/>|<text:p\b[\s\S]*?<\/text:p>/g;
  let token;
  let unsupported = 0;

  const pushImages = (xml) => {
    (xml.match(/<draw:image\b[^>]*>/g) || []).forEach((tag) => {
      const href = attr(tag, 'xlink:href') || '';
      const ext = href.split('.').pop().toLowerCase();
      const mime = IMAGE_TYPES[ext];
      const data = mime && zip.has(href) ? zip.bytes(href) : null;
      if (!data) unsupported += 1;
      const alt = decodeEntities(xml.match(/<svg:title>([\s\S]*?)<\/svg:title>/)?.[1] || xml.match(/<svg:desc>([\s\S]*?)<\/svg:desc>/)?.[1] || '').trim();
      doc.blocks.push({ t: 'img', alt, data, mime: data ? mime : null });
    });
  };

  const handleList = (xml) => {
    const ordered = /Num/i.test(xml.match(/<text:list\b[^>]*>/)[0]);
    (xml.match(/<text:p\b[\s\S]*?<\/text:p>/g) || []).forEach((p) => {
      const text = inline(p.replace(/^<text:p\b[^>]*>/, '').replace(/<\/text:p>$/, ''), styles, ctx).trim();
      if (text) doc.blocks.push({ t: 'li', text, ordered });
    });
  };

  while ((token = tokenRe.exec(body))) {
    const xml = token[0];
    if (xml.startsWith('<text:table-of-content')) {
      doc.meta.hasToc = true;
    } else if (xml.startsWith('<table:table')) {
      const rows = (xml.match(/<table:table-row\b[\s\S]*?<\/table:table-row>/g) || []).map((row) =>
        (row.match(/<table:table-cell\b[\s\S]*?<\/table:table-cell>/g) || []).map((cell) =>
          (cell.match(/<text:p\b[\s\S]*?<\/text:p>/g) || [])
            .map((p) => inline(p.replace(/^<text:p\b[^>]*>/, '').replace(/<\/text:p>$/, ''), styles, ctx).trim())
            .filter(Boolean)
            .join(' ')
        )
      ).filter((r) => r.length);
      if (rows.length) doc.blocks.push({ t: 'table', rows });
    } else if (xml.startsWith('<text:list')) {
      handleList(xml);
    } else if (xml.startsWith('<text:h')) {
      const level = Number(attr(xml.match(/<text:h\b[^>]*>/)[0], 'text:outline-level')) || 1;
      const text = stripMarks(inline(xml.replace(/^<text:h\b[^>]*>/, '').replace(/<\/text:h>$/, ''), styles, ctx)).replace(/\s+/g, ' ').trim();
      if (text) doc.blocks.push({ t: 'h', level, text });
    } else if (!xml.endsWith('/>')) {
      const head = xml.match(/<text:p\b[^>]*>/)[0];
      const inner = xml.replace(/^<text:p\b[^>]*>/, '').replace(/<\/text:p>$/, '');
      const text = inline(inner, styles, ctx).trim();
      const styleName = attr(head, 'text:style-name') || '';
      if (/^title$/i.test(styleName) && text) {
        doc.blocks.push({ t: 'h', level: 0, text: stripMarks(text) });
        if (!doc.title) doc.title = stripMarks(text);
      } else if (text) {
        doc.blocks.push({ t: /quotations?|citation/i.test(styleName) ? 'quote' : 'p', text });
      }
      if (/<draw:image\b/.test(inner)) pushImages(inner);
    }
  }

  ctx.notes.forEach((note, i) => doc.blocks.push({ t: 'p', text: `[${i + 1}] ${note}`, note: true }));
  doc.meta.footnotes = ctx.notes.length;
  if (unsupported) doc.meta.notes.push(`${unsupported} imagem(ns) em formato que o app não converte ficaram só como marcação "[Imagem]".`);
  if (doc.meta.macros) doc.meta.notes.push('O documento tem scripts ou macros. Eles foram ignorados e nunca são executados.');
  return doc;
}
