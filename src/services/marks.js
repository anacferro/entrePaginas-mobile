export const HIGHLIGHT_COLORS = [
  { label: 'Amarelo', color: '#FFE680' },
  { label: 'Verde', color: '#C5EBAA' },
  { label: 'Rosa', color: '#FFC2D4' },
  { label: 'Azul', color: '#BDE0FE' },
  { label: 'Laranja', color: '#FFD3A5' },
];

export const PIN_COLORS = ['#B5473F', '#244C3A', '#527A5B', '#7A5233', '#1F3347'];

function createMark(content, start, end, type, color, extra = {}) {
  return {
    ...extra,
    id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    start,
    end,
    type,
    color: color || null,
    text: content.slice(start, end),
  };
}

function subtract(marks, content, start, end, predicate) {
  const result = [];
  marks.forEach((m) => {
    if (!predicate(m) || m.end <= start || m.start >= end) {
      result.push(m);
      return;
    }
    if (m.start < start) result.push(createMark(content, m.start, start, m.type, m.color, m.title ? { title: m.title } : {}));
    if (m.end > end) result.push(createMark(content, end, m.end, m.type, m.color, m.title ? { title: m.title } : {}));
  });
  return result;
}

function isCovered(marks, start, end) {
  let pos = start;
  [...marks].sort((a, b) => a.start - b.start).forEach((m) => {
    if (m.start <= pos && m.end > pos) pos = m.end;
  });
  return pos >= end;
}

export function applyMark(marks = [], content, start, end, type, color, title) {
  if (start >= end) return marks;

  if (type === 'pin') {
    return [
      ...subtract(marks, content, start, end, m => m.type === 'pin'),
      createMark(content, start, end, type, color, { title: title || 'Trecho marcado' }),
    ];
  }

  if (type === 'highlight') {
    return [
      ...subtract(marks, content, start, end, m => m.type === 'highlight'),
      createMark(content, start, end, type, color),
    ];
  }

  const covered = isCovered(marks.filter(m => m.type === type), start, end);
  const rest = subtract(marks, content, start, end, m => m.type === type);
  return covered ? rest : [...rest, createMark(content, start, end, type)];
}

export function clearMarks(marks = [], content, start, end) {
  return subtract(marks, content, start, end, () => true);
}

export function relocateMarks(marks = [], newContent) {
  return marks
    .map((m) => {
      if (newContent.slice(m.start, m.end) === m.text) return m;
      const near = newContent.indexOf(m.text, Math.max(0, m.start - 500));
      const index = near !== -1 ? near : newContent.indexOf(m.text);
      return index === -1 || !m.text ? null : { ...m, start: index, end: index + m.text.length };
    })
    .filter(Boolean);
}

export function buildSegments(content, marks = []) {
  const points = new Set([0, content.length]);
  marks.forEach((m) => {
    points.add(Math.max(0, Math.min(m.start, content.length)));
    points.add(Math.max(0, Math.min(m.end, content.length)));
  });
  const sorted = [...points].sort((a, b) => a - b);

  const segments = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;

    const active = marks.filter(m => m.start <= start && m.end >= end);
    segments.push({
      text: content.slice(start, end),
      highlight: active.filter(m => m.type === 'highlight').pop()?.color || null,
      pin: active.filter(m => m.type === 'pin').pop()?.color || null,
      bold: active.some(m => m.type === 'bold'),
      italic: active.some(m => m.type === 'italic'),
      underline: active.some(m => m.type === 'underline'),
    });
  }
  return segments;
}

export function diffSnippet(before = '', after = '', context = 40) {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;

  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) suffix++;

  while (prefix > 0 && /\S/.test(before[prefix - 1])) prefix--;
  while (suffix > 0 && /\S/.test(before[before.length - suffix])) suffix--;

  const lead = before.slice(Math.max(0, prefix - context), prefix);
  const trail = before.slice(before.length - suffix, before.length - suffix + context);

  return {
    lead: (prefix > context ? '…' : '') + lead,
    removed: before.slice(prefix, before.length - suffix),
    added: after.slice(prefix, after.length - suffix),
    trail: trail + (suffix > context ? '…' : ''),
  };
}
