import { newDoc, BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE, stripMarks } from '../model.js';

const CHAPTER_WORD = /^(cap[ií]tulo|parte|livro|pr[oó]logo|ep[ií]logo|pref[aá]cio|introdu[cç][aã]o|ppr[oó]logo)\b/i;
const LIST_ITEM = /^\s*([-*+•]|\d{1,3}[.)])\s+(.*)$/;

function inlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, `${BOLD_OPEN}$2${BOLD_CLOSE}`)
    .replace(/(?<![\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, `${ITALIC_OPEN}$1${ITALIC_CLOSE}`)
    .replace(/(?<![\w_])_(?=\S)([^_\n]*?\S)_(?![\w_])/g, `${ITALIC_OPEN}$1${ITALIC_CLOSE}`)
    .replace(/`([^`]+)`/g, '$1');
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
}

function detectHardWrap(groups) {
  const lengths = [];
  let candidates = 0;
  let wrapped = 0;
  groups.forEach((lines) => {
    if (lines.length < 3) return;
    lines.slice(0, -1).forEach((l) => lengths.push(l.trim().length));
  });
  if (lengths.length < 6) return 0;
  const maxLen = percentile(lengths, 0.95);
  if (maxLen < 45 || maxLen > 110) return 0;
  groups.forEach((lines) => {
    if (lines.length < 3) return;
    candidates += 1;
    const body = lines.slice(0, -1).map((l) => l.trim().length);
    const near = body.filter((n) => n >= maxLen * 0.72).length / body.length;
    if (near >= 0.8) wrapped += 1;
  });
  return candidates >= 2 && wrapped / candidates >= 0.6 ? maxLen : 0;
}

function joinLines(lines) {
  let out = '';
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (!out) out = line;
    else if (/[\p{L}]-$/u.test(out) && /^\p{Ll}/u.test(line)) out += line;
    else out += ` ${line}`;
  });
  return out;
}

function isHeadingLine(line, prevBlank, nextBlank) {
  const text = line.trim();
  if (!text || text.length > 80) return false;
  if (CHAPTER_WORD.test(text) && prevBlank && nextBlank && !/[.,;]$/.test(text)) return true;
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (prevBlank && nextBlank && letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase() && !/[.,;:!?]$/.test(text) && text.length <= 60) return true;
  return false;
}

export function readText(source, { markdown = false, name = '' } = {}) {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/[\u2028\u2029]/g, '\n');
  const doc = newDoc();
  const lines = text.split('\n');
  const groups = [];
  let current = [];
  lines.forEach((line) => {
    if (!line.trim()) {
      if (current.length) groups.push(current);
      current = [];
    } else current.push(line);
  });
  if (current.length) groups.push(current);

  const plainGroups = groups.filter((g) => !(markdown && g.some((l) => /^\s*(#{1,6}\s|>|```|\||!\[)/.test(l))));
  const wrapMax = detectHardWrap(plainGroups);
  const hardWrap = wrapMax > 0;
  doc.meta.hardWrap = hardWrap;

  let inFence = false;
  let fence = [];
  const out = doc.blocks;
  const rawGroups = text.split(/\n[ \t]*\n/);

  const pushParagraph = (groupLines, prevBlank = true, nextBlank = true) => {
    if (groupLines.length === 1 && isHeadingLine(groupLines[0], prevBlank, nextBlank) && !markdown) {
      const t = groupLines[0].trim();
      const prev = out[out.length - 1];
      if (prev && prev.t === 'h' && prev.fromChapterWord && !CHAPTER_WORD.test(t) && t.length < 70 && prev.level === 1 && !prev.titled) {
        prev.text = `${prev.text} — ${t}`;
        prev.titled = true;
        return;
      }
      out.push({ t: 'h', level: 1, text: t, fromChapterWord: CHAPTER_WORD.test(t) });
      return;
    }
    const shortLimit = hardWrap ? wrapMax * 0.72 : 60;
    const looksLikeVerse = groupLines.length >= 2 && groupLines.slice(0, hardWrap ? -1 : undefined).every((l) => l.trim().length < shortLimit);
    if (looksLikeVerse && !markdown) {
      out.push({ t: 'pre', text: groupLines.map((l) => l.replace(/\s+$/, '')).join('\n') });
      return;
    }
    const joined = groupLines.length === 1 || hardWrap || !looksLikeVerse ? joinLines(groupLines) : groupLines.join('\n');
    out.push({ t: 'p', text: markdown ? inlineMarkdown(joined) : joined });
  };

  rawGroups.forEach((chunk, gi) => {
    const groupLines = chunk.split('\n').filter((l, i, arr) => l.trim() || (i > 0 && i < arr.length - 1));
    if (!markdown) {
      if (groupLines.some((l) => l.trim())) pushParagraph(groupLines.filter((l) => l.trim()), true, true);
      return;
    }
    let buffer = [];
    const flush = () => {
      if (buffer.length) pushParagraph(buffer);
      buffer = [];
    };
    groupLines.forEach((line, i) => {
      if (/^\s*```/.test(line)) {
        if (inFence) {
          out.push({ t: 'pre', text: fence.join('\n') });
          fence = [];
          inFence = false;
        } else {
          flush();
          inFence = true;
        }
        return;
      }
      if (inFence) {
        fence.push(line);
        return;
      }
      const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      const item = line.match(LIST_ITEM);
      if (heading) {
        flush();
        out.push({ t: 'h', level: heading[1].length, text: stripMarks(inlineMarkdown(heading[2])) });
      } else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flush();
      } else if (/^\s*>\s?/.test(line)) {
        flush();
        const last = out[out.length - 1];
        const quote = inlineMarkdown(line.replace(/^\s*>\s?/, ''));
        if (last && last.t === 'quote' && last.open) last.text += ` ${quote}`;
        else out.push({ t: 'quote', text: quote, open: true });
      } else if (line.includes('|') && /^\s*\|?\s*:?-{2,}/.test(groupLines[i + 1] || '') ) {
        flush();
        const rows = [];
        let k = i;
        while (k < groupLines.length && groupLines[k].includes('|')) {
          if (!/^\s*\|?[\s:|-]+\|?\s*$/.test(groupLines[k])) rows.push(groupLines[k].replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => inlineMarkdown(c.trim())));
          groupLines[k] = '';
          k += 1;
        }
        out.push({ t: 'table', rows });
      } else if (!line.trim()) {
        flush();
      } else if (item) {
        flush();
        out.push({ t: 'li', text: inlineMarkdown(item[2]), ordered: /\d/.test(item[1]) });
      } else if (/^!\[([^\]]*)\]\(/.test(line.trim())) {
        flush();
        out.push({ t: 'img', alt: line.trim().match(/^!\[([^\]]*)\]/)[1], data: null });
        doc.meta.imagesDropped = (doc.meta.imagesDropped || 0) + 1;
      } else buffer.push(line);
    });
    flush();
    if (gi === rawGroups.length - 1 && inFence && fence.length) out.push({ t: 'pre', text: fence.join('\n') });
  });

  out.forEach((b) => {
    delete b.open;
    delete b.fromChapterWord;
    delete b.titled;
  });

  const h1 = out.filter((b) => b.t === 'h' && b.level === 1);
  if (out[0]?.t === 'h' && out[0].level === 1 && h1.length === 1 && markdown) {
    doc.title = stripMarks(out[0].text);
    out[0] = { ...out[0], level: 0 };
  }
  doc.meta.pagesEstimated = true;
  doc.meta.name = name;
  if (doc.meta.imagesDropped) doc.meta.notes.push(`${doc.meta.imagesDropped} imagem(ns) referenciada(s) no Markdown são links externos e não foram baixadas: ficaram como "[Imagem]".`);
  if (hardWrap) doc.meta.notes.push('O texto tinha quebras de linha fixas no meio dos parágrafos; as linhas foram unidas sem alterar nenhuma palavra.');
  return doc;
}
