export const MAX_CONTEXT_CHARS = 300000;
const HEAD_CHARS = 60000;

export const normalizeText = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, '')
    .replace(/…|\.{3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function pageLabel(chapters, pages, pageIndex) {
  const page = pages[pageIndex];
  if (!page) return '';
  const chapter = chapters[page.chapterIndex];
  const title = chapter?.title ? ` (${chapter.title})` : '';
  return `Capítulo ${page.chapterIndex + 1}${title}, folha ${pageIndex + 1}`;
}

export function hashText(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}:${h >>> 0}`;
}

export function buildContext(chapters, pages, limitIndex) {
  const last = Math.max(0, Math.min(limitIndex, pages.length - 1));
  const parts = [];
  for (let i = 0; i <= last; i += 1) {
    const page = pages[i];
    const chapter = chapters[page.chapterIndex];
    const heading = `[[Capítulo ${page.chapterIndex + 1} — ${chapter?.title || 'sem título'} · folha ${i + 1}]]`;
    parts.push({ pageIndex: i, text: `${heading}\n${page.content}` });
  }

  let kept = parts;
  let truncated = false;
  const total = parts.reduce((n, p) => n + p.text.length + 2, 0);
  if (total > MAX_CONTEXT_CHARS) {
    truncated = true;
    kept = [];
    let head = 0;
    let index = 0;
    while (index < parts.length && head + parts[index].text.length <= HEAD_CHARS) {
      kept.push(parts[index]);
      head += parts[index].text.length + 2;
      index += 1;
    }
    const tail = [];
    let size = head;
    for (let i = parts.length - 1; i >= index; i -= 1) {
      if (size + parts[i].text.length + 2 > MAX_CONTEXT_CHARS) break;
      tail.unshift(parts[i]);
      size += parts[i].text.length + 2;
    }
    if (tail.length && tail[0].pageIndex > index) {
      kept.push({ pageIndex: -1, text: '[[trecho intermediário omitido por tamanho]]' });
    }
    kept.push(...tail);
  }

  const text = kept.map((p) => p.text).join('\n\n');
  const norm = [];
  let joined = '';
  kept.forEach((p) => {
    if (p.pageIndex < 0) return;
    const body = normalizeText(p.text.slice(p.text.indexOf('\n') + 1));
    norm.push({ pageIndex: p.pageIndex, start: joined.length, end: joined.length + body.length });
    joined += `${body} `;
  });

  return { text, limitIndex: last, truncated, normalized: joined, index: norm };
}

export function locateQuote(context, quote) {
  const needle = normalizeText(quote);
  if (needle.length < 12) return -1;
  const at = context.normalized.indexOf(needle);
  if (at === -1) return -1;
  const hit = context.index.find((p) => at >= p.start && at < p.end + 1);
  return hit ? hit.pageIndex : -1;
}

export function containsName(context, name) {
  const needle = normalizeText(name);
  if (needle.length < 2) return false;
  const pattern = new RegExp(`(^|[^\\p{L}])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u');
  return pattern.test(context.normalized);
}
