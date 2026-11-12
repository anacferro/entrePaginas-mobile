const STRONG_END = /[.!?…»”"’]$/;
const DIALOGUE_START = /^[—–]\s?|^-\s+\S|^[«“"‘]/;

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function mode(values, step) {
  const counts = new Map();
  values.forEach((v) => {
    const key = Math.round(v / step) * step;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  let best = 0;
  let bestCount = -1;
  counts.forEach((count, key) => {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  });
  return best;
}

function signature(text) {
  return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isPageNumber(text) {
  const t = text.trim();
  return /^[-–—\s]*\d{1,4}[-–—\s]*$/.test(t) || /^(?:p[áa]g(?:ina)?\.?\s*)?\d{1,4}(?:\s*(?:de|\/)\s*\d{1,4})?$/i.test(t) || /^[ivxlcdm]{1,6}$/i.test(t);
}

export function assemblePages(pages) {
  const removed = [];
  const doubts = [];
  const usable = pages.map((page) => {
    const ys = page.lines.map((l) => l.y);
    const top = page.height || Math.max(...ys, 0);
    const bottom = page.height ? 0 : Math.min(...ys, 0);
    const span = Math.max(1, top - bottom);
    return { ...page, edge: span * 0.09, top, bottom };
  });

  const edgeSignatures = new Map();
  usable.forEach((page) => {
    const seen = new Set();
    page.lines.forEach((line) => {
      const nearTop = page.top - line.y <= page.edge;
      const nearBottom = line.y - page.bottom <= page.edge;
      if (!nearTop && !nearBottom) return;
      const sig = signature(line.text);
      if (!sig || seen.has(sig)) return;
      seen.add(sig);
      edgeSignatures.set(sig, (edgeSignatures.get(sig) || 0) + 1);
    });
  });
  const minRepeats = Math.max(3, Math.ceil(pages.length * 0.3));

  const kept = [];
  usable.forEach((page, pageIndex) => {
    const lines = page.lines.filter((line) => {
      const nearTop = page.top - line.y <= page.edge;
      const nearBottom = line.y - page.bottom <= page.edge;
      if (!nearTop && !nearBottom) return true;
      const sig = signature(line.text);
      if (isPageNumber(line.text)) {
        removed.push({ kind: 'numero-de-pagina', text: line.text.trim(), page: pageIndex + 1 });
        return false;
      }
      if ((edgeSignatures.get(sig) || 0) >= minRepeats) {
        removed.push({ kind: nearTop ? 'cabecalho' : 'rodape', text: line.text.trim(), page: pageIndex + 1 });
        return false;
      }
      return true;
    });
    kept.push({ lines, pageIndex });
  });

  const all = kept.flatMap((p) => p.lines.map((l, i) => ({ ...l, pageStart: i === 0, pageIndex: p.pageIndex })));
  if (!all.length) return { text: '', removed, doubts };

  const bodyLines = all.filter((l) => l.text.trim().length > 2);
  const left = mode(bodyLines.map((l) => l.x), 2);
  const bodySize = mode(bodyLines.map((l) => l.size), 0.5) || 12;
  const gaps = [];
  for (let i = 1; i < all.length; i += 1) {
    const dy = all[i - 1].y - all[i].y;
    if (!all[i].pageStart && dy > 0 && Math.abs(all[i].size - all[i - 1].size) < 0.6) gaps.push(dy);
  }
  const lineGap = median(gaps) || bodySize * 1.3;
  const charsPerUnit = bodyLines.map((l) => l.text.trim().length / Math.max(1, l.size));
  const fullLine = median(charsPerUnit.filter((c) => c >= median(charsPerUnit)));
  const longest = Math.max(...charsPerUnit, 1);
  const width = fullLine * 0.95 || longest * 0.9;

  const out = [];
  const offsets = [];
  let outLength = 0;
  let current = '';
  all.forEach((line, index) => {
    const text = line.text.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const prev = index > 0 ? all[index - 1] : null;
    const bigger = line.size > bodySize * 1.2 || (prev && prev.size > bodySize * 1.2 && line.size <= bodySize * 1.2);
    const gapBig = prev && !line.pageStart && prev.y - line.y > lineGap * 1.55;
    const indent = line.x - left > bodySize * 0.8 && line.x - left < bodySize * 6;
    const prevText = current.trim();
    const prevShort = prev && prev.text.trim().length / Math.max(1, prev.size) < width * 0.72;
    const prevEnds = STRONG_END.test(prevText);
    const dialogue = DIALOGUE_START.test(text) && (prevEnds || prevShort);
    const isNew = !current || bigger || gapBig || (indent && (prevEnds || prevShort || !line.pageStart)) || (prevShort && prevEnds) || dialogue;
    const at = isNew ? outLength + (current ? current.length + 2 : 0) : outLength + current.length + 1;
    if (offsets[line.pageIndex] === undefined) offsets[line.pageIndex] = at;
    if (isNew) {
      if (current) {
        out.push(current);
        outLength += current.length + 2;
      }
      current = text;
    } else {
      current += `\n${text}`;
    }
  });
  if (current) out.push(current);

  return { text: out.join('\n\n'), removed, doubts, metrics: { left, bodySize, lineGap, width } };
}
