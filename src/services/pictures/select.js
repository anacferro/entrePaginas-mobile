export const PICTURE_LIMITS = {
  minSide: 80,
  minArea: 25000,
  maxBytes: 3 * 1024 * 1024,
  maxCount: 80,
  repeatedOnPages: 3,
  coverPages: 3,
  coverCandidates: 4,
};

const ratioOf = (p) => p.width / p.height;

export function keepPictures(pictures, pageCount = 0) {
  const pagesOf = new Map();
  pictures.forEach((p) => {
    if (p.pageIndex === undefined) return;
    if (!pagesOf.has(p.id)) pagesOf.set(p.id, new Set());
    pagesOf.get(p.id).add(p.pageIndex);
  });
  const repeated = (p) => pageCount >= 8 && (pagesOf.get(p.id)?.size || 0) >= PICTURE_LIMITS.repeatedOnPages;

  const seen = new Set();
  return pictures
    .filter((p) => {
      if (!p.bytes || p.bytes.length > PICTURE_LIMITS.maxBytes) return false;
      if (Math.min(p.width, p.height) < PICTURE_LIMITS.minSide || p.width * p.height < PICTURE_LIMITS.minArea) return false;
      if (ratioOf(p) < 0.15 || ratioOf(p) > 6.5) return false;
      if (repeated(p)) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .slice(0, PICTURE_LIMITS.maxCount);
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

export function anchorPictures(pictures, chapters, ratioOfPicture) {
  const lengths = chapters.map((c) => (c.content || '').length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const placed = chapters.map(() => []);
  if (!total) return placed;
  pictures.forEach((p) => {
    const target = Math.min(total - 1, Math.floor(ratioOfPicture(p) * total));
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
