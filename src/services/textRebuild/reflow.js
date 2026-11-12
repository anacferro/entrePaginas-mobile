const STRONG_END = /[.!?…»”"’]$/;
const DIALOGUE_START = /^[—–]\s?|^-\s+\S|^[«“"‘]/;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function isHeadingLine(line) {
  const t = line.trim();
  if (!t || t.length > 70) return false;
  if (/^(cap[ií]tulo|parte|livro|prefácio|prólogo|epílogo|introdução)\b/i.test(t) && !/[,;]$/.test(t) && t.split(/\s+/).length <= 8) return true;
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return letters.length >= 3 && t === t.toUpperCase() && !/[.!?]$/.test(t) && t.split(/\s+/).length <= 8;
}

function isListLine(line) {
  return /^\s*([-*•·]|\d{1,3}[.)])\s+\S/.test(line);
}

function looksLikeVerse(lines, width) {
  if (lines.length < 2) return false;
  const lengths = lines.map((l) => l.trim().length);
  const median = percentile(lengths, 0.5);
  if (!width || median > width * 0.72) return false;
  const noTerminal = lines.filter((l) => !STRONG_END.test(l.trim())).length / lines.length;
  const capitalised = lines.filter((l) => /^[A-ZÀ-Þ«“"‘—–]/.test(l.trim())).length / lines.length;
  const regular = lengths.filter((n) => n >= median * 0.5 && n <= median * 1.6).length / lines.length;
  return noTerminal >= 0.5 && capitalised >= 0.8 && regular >= 0.8;
}

function hyphenJoin(left, right, lex, stats) {
  const match = left.match(/([A-Za-zÀ-ÿ]+)-$/);
  const head = right.match(/^([A-Za-zÀ-ÿ]+)/);
  if (!match || !head || !/^[a-zà-ÿ]/.test(right)) return null;
  const first = match[1];
  const second = head[1];
  const joined = `${first}${second}`;
  const compound = `${first}-${second}`;
  if (lex?.hasHyphenated(compound)) return { keep: true };
  if (lex && lex.freq(joined) >= 1) return { keep: false };
  if (lex && lex.freq(first) >= 2 && lex.freq(second) >= 2) {
    stats.doubts.push({ kind: 'hifen-ambiguo', text: compound, motivo: 'as duas metades são palavras do livro' });
    return { keep: true };
  }
  if (lex && lex.freq(first) >= 1 && first.length >= 4 && lex.freq(joined) === 0 && lex.freq(second) >= 1) {
    stats.doubts.push({ kind: 'hifen-ambiguo', text: compound, motivo: 'sem evidência para juntar' });
    return { keep: true };
  }
  return { keep: false };
}

function joinWrapped(lines, lex, stats) {
  let out = lines[0].trim();
  for (let i = 1; i < lines.length; i += 1) {
    const next = lines[i].trim();
    if (!next) continue;
    const hyphen = hyphenJoin(out, next, lex, stats);
    if (hyphen) {
      out = hyphen.keep ? `${out}${next}` : `${out.slice(0, -1)}${next}`;
      stats.hyphens += 1;
    } else out = `${out} ${next}`;
  }
  return out;
}

function splitSegment(lines, ctx) {
  const blocks = [];
  let run = [];
  const flush = () => {
    if (run.length) blocks.push({ type: 'p', lines: run });
    run = [];
  };
  lines.forEach((line) => {
    const trimmed = line.trim();
    const prev = run.length ? run[run.length - 1].trim() : '';
    if (!run.length) {
      run.push(line);
      return;
    }
    const prevLen = prev.length;
    if (isHeadingLine(prev) || isHeadingLine(trimmed)) {
      flush();
      run.push(line);
      return;
    }
    const startsDialogue = DIALOGUE_START.test(trimmed) && (STRONG_END.test(prev) || prevLen < ctx.width * 0.8);
    const indented = ctx.useIndent && /^\s{2,}\S/.test(line) && STRONG_END.test(prev);
    const shortEnd = STRONG_END.test(prev) && prevLen < ctx.width * ctx.shortRatio;
    const listStart = isListLine(line) && !isListLine(run[run.length - 1]);
    const upperAfterEnd = STRONG_END.test(prev) && /^[A-ZÀ-Þ]/.test(trimmed) && prevLen < ctx.width * 0.9;
    if (startsDialogue || indented || shortEnd || listStart || upperAfterEnd) flush();
    run.push(line);
  });
  flush();
  return blocks;
}

export function reflow(text, { lex = null, wrapped = null, trustBlank = true } = {}) {
  const stats = { joined: 0, hyphens: 0, paragraphs: 0, verse: 0, doubts: [], wrapped: false };
  const normalized = String(text || '').replace(/\r\n?/g, '\n');
  const segments = trustBlank ? normalized.split(/\n[ \t]*\n+/) : [normalized];
  const lengths = [];
  segments.forEach((segment) => {
    const lines = segment.split('\n').filter((l) => l.trim());
    if (lines.length > 1) lines.forEach((l) => lengths.push(l.trim().length));
  });
  const width = percentile(lengths, 0.9);
  const nearWidth = lengths.filter((n) => n >= width * 0.78 && n <= width + 2).length;
  let pairs = 0;
  let mid = 0;
  let hyphenBreaks = 0;
  segments.forEach((segment) => {
    const lines = segment.split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = 1; i < lines.length; i += 1) {
      pairs += 1;
      if (/[A-Za-zÀ-ÿ]-$/.test(lines[i - 1]) && /^[a-zà-ÿ]/.test(lines[i])) hyphenBreaks += 1;
      else if (!STRONG_END.test(lines[i - 1]) && /^[a-zà-ÿ]/.test(lines[i])) mid += 1;
    }
  });
  const widthEvidence = lengths.length >= 4 && width >= 40 && nearWidth / lengths.length >= 0.5;
  const midEvidence = width >= 40 && pairs >= 3 && mid / pairs >= 0.3;
  const hasWrap = wrapped !== null ? wrapped : widthEvidence || midEvidence || hyphenBreaks >= 1;
  stats.wrapped = hasWrap;

  const ctx = { width, useIndent: segments.length === 1 || hasWrap, shortRatio: 0.72 };
  const out = [];

  segments.forEach((segment) => {
    const lines = segment.split('\n').filter((l) => l.trim().length);
    if (!lines.length) return;
    if (lines.length === 1) {
      out.push(lines[0].trim());
      stats.paragraphs += 1;
      return;
    }
    if (!hasWrap) {
      stats.paragraphs += lines.length;
      lines.forEach((l) => out.push(l.trim()));
      return;
    }
    if (lines.every(isListLine)) {
      out.push(lines.map((l) => l.trim()).join('\n'));
      stats.paragraphs += 1;
      return;
    }
    if (looksLikeVerse(lines, width)) {
      out.push(lines.map((l) => l.trim()).join('\n'));
      stats.verse += 1;
      stats.paragraphs += 1;
      stats.doubts.push({ kind: 'verso', text: lines[0].trim().slice(0, 60), motivo: 'linhas curtas e regulares: quebras preservadas' });
      return;
    }
    splitSegment(lines, ctx).forEach((block) => {
      out.push(joinWrapped(block.lines, lex, stats));
      stats.joined += block.lines.length - 1;
      stats.paragraphs += 1;
    });
  });

  return { text: out.join('\n\n'), stats };
}
