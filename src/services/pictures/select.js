export const PICTURE_LIMITS = {
  coverPages: 3,
  coverCandidates: 4,
};

const ratioOf = (p) => p.width / p.height;

export function keepPictures(pictures) {
  return pictures.filter((p) => p.bytes && p.bytes.length);
}

export function coverCandidates(pictures) {
  return pictures
    .filter((p) => (p.pageIndex === undefined || p.pageIndex < PICTURE_LIMITS.coverPages) && p.width * p.height >= 60000)
    .sort((a, b) => {
      const portrait = (p) => (ratioOf(p) >= 0.5 && ratioOf(p) <= 0.95 ? 1 : 0);
      return portrait(b) - portrait(a) || (a.pageIndex ?? 0) - (b.pageIndex ?? 0) || b.width * b.height - a.width * a.height;
    })
    .slice(0, PICTURE_LIMITS.coverCandidates);
}

export function guessCover(pictures) {
  const first = coverCandidates(pictures).find((p) => (p.pageIndex ?? 0) === 0 && ratioOf(p) >= 0.5 && ratioOf(p) <= 0.95);
  return first || null;
}

function snapToParagraph(content, at) {
  if (at >= content.length) return content.length;
  const next = content.indexOf('\n\n', at);
  return next === -1 ? content.length : next;
}

const WORDS_IN_SNIPPET = 6;

function fold(text) {
  let out = '';
  const map = [];
  for (let i = 0; i < text.length; i += 1) {
    const base = text[i].normalize('NFD')[0].toLowerCase();
    if (/[a-z0-9]/.test(base)) {
      out += base;
      map.push(i);
    } else if (out && out[out.length - 1] !== ' ') {
      out += ' ';
      map.push(i);
    }
  }
  return { out, map, content: text };
}

function snippetOf(line, fromEnd) {
  const words = fold(line).out.trim().split(' ').filter(Boolean);
  const chosen = fromEnd ? words.slice(-WORDS_IN_SNIPPET) : words.slice(0, WORDS_IN_SNIPPET);
  const text = chosen.join(' ');
  return text.length >= 6 ? text : null;
}

function paragraphStart(content, at) {
  const cut = content.lastIndexOf('\n\n', at);
  return cut === -1 ? 0 : cut + 2;
}

function locate(folded, offsets, anchor, hint) {
  const attempts = [
    ...(anchor.after || []).map((line) => ({ snippet: snippetOf(line, false), end: false })),
    ...[...(anchor.before || [])].reverse().map((line) => ({ snippet: snippetOf(line, true), end: true })),
  ];
  for (const { snippet, end } of attempts) {
    if (!snippet) continue;
    let best = null;
    folded.forEach((entry, chapterIndex) => {
      let from = 0;
      let index;
      while ((index = entry.out.indexOf(snippet, from)) !== -1) {
        const original = entry.map[index];
        const startsParagraph = original === 0 || entry.content.slice(original - 2, original) === '\n\n';
        const distance = Math.abs(offsets[chapterIndex] + original - hint) + (end || startsParagraph ? 0 : 1000000);
        if (!best || distance < best.distance) best = { chapterIndex, index: end ? index + snippet.length - 1 : index, distance };
        from = index + 1;
      }
    });
    if (best) return { chapterIndex: best.chapterIndex, original: folded[best.chapterIndex].map[Math.min(best.index, folded[best.chapterIndex].map.length - 1)], end };
  }
  return null;
}

export function anchorPictures(pictures, chapters, ratioOfPicture) {
  const lengths = chapters.map((c) => (c.content || '').length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const placed = chapters.map(() => []);
  if (!total) return placed;
  const folded = chapters.map((c) => fold(c.content || ''));
  const offsets = [];
  lengths.reduce((acc, length, i) => {
    offsets[i] = acc;
    return acc + length;
  }, 0);
  pictures.forEach((p) => {
    const target = Math.min(total - 1, Math.floor(ratioOfPicture(p) * total));
    const found = p.anchor ? locate(folded, offsets, p.anchor, target) : null;
    if (found) {
      const content = chapters[found.chapterIndex].content || '';
      const start = paragraphStart(content, found.original);
      const offset = found.end ? snapToParagraph(content, found.original) : found.original - start < 3 ? start : snapToParagraph(content, found.original);
      placed[found.chapterIndex].push({ ...p, offset });
      return;
    }
    let acc = 0;
    for (let i = 0; i < chapters.length; i += 1) {
      if (target < acc + lengths[i] || i === chapters.length - 1) {
        const local = Math.max(0, target - acc);
        placed[i].push({ ...p, offset: snapToParagraph(chapters[i].content || '', local) });
        return;
      }
      acc += lengths[i];
    }
  });
  placed.forEach((list) => list.sort((a, b) => a.offset - b.offset));
  return placed;
}
