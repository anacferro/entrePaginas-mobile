const BOLD_OPEN = '\u0001';
const BOLD_CLOSE = '\u0002';
const ITALIC_OPEN = '\u0003';
const ITALIC_CLOSE = '\u0004';

const ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '—', ndash: '–', hellip: '…', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', middot: '·',
  deg: '°', sect: '§', para: '¶', times: '×',
};

const ACCENTS = {
  acute: 'áéíóúýÁÉÍÓÚÝ',
  grave: 'àèìòùÀÈÌÒÙ',
  circ: 'âêîôûÂÊÎÔÛ',
  tilde: 'ãõñÃÕÑ',
  uml: 'äëïöüÿÄËÏÖÜ',
};

Object.entries(ACCENTS).forEach(([suffix, chars]) => {
  [...chars].forEach((char) => {
    const base = char.normalize('NFD')[0];
    ENTITIES[`${base}${suffix}`] = char;
  });
});
Object.assign(ENTITIES, { ccedil: 'ç', Ccedil: 'Ç', aelig: 'æ', AElig: 'Æ', oelig: 'œ', szlig: 'ß' });

const BREAK_TAGS = new Set(['p', 'div', 'blockquote', 'li', 'tr', 'hr', 'table', 'ul', 'ol', 'pre', 'section']);

export function looksLikeHtml(text) {
  return /^\s*(<\?xml|<!doctype|<html)/i.test(text.slice(0, 400));
}

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) && value > 0 ? String.fromCodePoint(value) : '';
    }
    return ENTITIES[code] ?? ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function stripBoilerplate(text) {
  let out = text;
  const start = out.search(/\*\*\* ?START OF[^\n]*\n/i);
  if (start >= 0) out = out.slice(out.indexOf('\n', start) + 1);
  const end = out.search(/\*\*\* ?END OF/i);
  if (end >= 0) out = out.slice(0, end);
  return out;
}

export function htmlToText(html) {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(head|script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(span|a)\b[^>]*class="[^"]*pagenum[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, '');

  let out = '';
  let heading = false;

  cleaned.split(/(<[^>]+>)/).forEach((token) => {
    if (!token) return;

    if (token[0] !== '<') {
      out += decodeEntities(token.replace(/\s+/g, ' '));
      return;
    }

    const match = token.match(/^<\/?\s*([a-z0-9]+)/i);
    if (!match) return;
    const name = match[1].toLowerCase();
    const closing = token[1] === '/';

    if (/^h[1-3]$/.test(name)) {
      heading = !closing;
      out += closing ? '\n\n' : '\n\n# ';
    } else if (name === 'b' || name === 'strong') {
      if (!heading) out += closing ? BOLD_CLOSE : BOLD_OPEN;
    } else if (name === 'i' || name === 'em') {
      if (!heading) out += closing ? ITALIC_CLOSE : ITALIC_OPEN;
    } else if (name === 'br') {
      out += '\n';
    } else if (name === 'td' || name === 'th') {
      out += ' ';
    } else if (BREAK_TAGS.has(name) || /^h[4-6]$/.test(name)) {
      out += '\n\n';
    }
  });

  return stripBoilerplate(out)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractSentinelMarks(content) {
  const marks = [];
  const open = {};
  let out = '';

  const push = (type, start, end) => {
    if (end <= start) return;
    marks.push({
      id: `mark-${Date.now()}-${marks.length}`,
      start,
      end,
      type,
      color: null,
      text: out.slice(start, end),
    });
  };

  for (const char of content) {
    if (char === BOLD_OPEN) open.bold = out.length;
    else if (char === ITALIC_OPEN) open.italic = out.length;
    else if (char === BOLD_CLOSE) {
      push('bold', open.bold ?? 0, out.length);
      open.bold = undefined;
    } else if (char === ITALIC_CLOSE) {
      push('italic', open.italic ?? 0, out.length);
      open.italic = undefined;
    } else out += char;
  }

  if (open.bold !== undefined) push('bold', open.bold, out.length);
  if (open.italic !== undefined) push('italic', open.italic, out.length);

  return { content: out, marks };
}

export function stripSentinels(text) {
  return (text || '').replace(/[\u0001-\u0004]/g, '');
}
