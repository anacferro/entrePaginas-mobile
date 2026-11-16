export const PAGE_SIZE = 1800;

function cutPoint(content, start) {
  const limit = Math.min(start + PAGE_SIZE, content.length);
  if (limit >= content.length) return content.length;

  const floor = start + Math.floor(PAGE_SIZE / 2);
  const window = content.slice(floor, limit);
  for (const separator of ['\n\n', '\n', '. ', ' ']) {
    const at = window.lastIndexOf(separator);
    if (at !== -1) return floor + at + separator.length;
  }
  return limit;
}

function marksFor(marks, start, end) {
  return (marks || [])
    .filter(m => m.end > start && m.start < end)
    .map(m => ({ ...m, start: Math.max(m.start, start) - start, end: Math.min(m.end, end) - start }));
}

function snapToParagraph(content, at) {
  if (at <= 0) return 0;
  if (at >= content.length) return content.length;
  if (content[at - 1] === '\n') return at;
  const next = content.indexOf('\n', at);
  if (next === -1) return content.length;
  let end = next;
  while (end < content.length && content[end] === '\n') end += 1;
  return end;
}

export function splitPage(page) {
  const content = page.content || '';
  const images = (page.images || [])
    .map((image) => ({ image, at: snapToParagraph(content, Math.max(0, (image.offset || 0) - page.start)) }))
    .sort((a, b) => a.at - b.at);
  if (!images.length) return [{ type: 'text', content, marks: page.marks || [], first: true }];

  const parts = [];
  let from = 0;
  let first = true;
  const pushText = (to) => {
    if (to <= from) return;
    const slice = content.slice(from, to);
    if (slice.trim()) {
      parts.push({ type: 'text', content: slice, marks: marksFor(page.marks, from, to), first });
      first = false;
    }
    from = to;
  };
  images.forEach(({ image, at }) => {
    pushText(at);
    parts.push({ type: 'image', image });
  });
  pushText(content.length);
  return parts;
}

export function paginate(chapters) {
  const pages = [];

  chapters.forEach((chapter, chapterIndex) => {
    const content = chapter.content || '';
    const figures = (chapter.images || []).map((image) => ({ ...image, offset: Math.min(image.offset || 0, content.length) }));

    // Skip chapters with no meaningful text content
    if (!content.trim() && !chapter.photo && figures.length === 0) {
      // Still create one placeholder page so the chapter appears in the reader
      pages.push({
        chapterIndex,
        chapterId: chapter.id,
        opensChapter: true,
        continues: false,
        start: 0,
        content: '',
        marks: [],
        photo: chapter.photo || null,
        images: [],
        empty: true,
      });
      return;
    }

    let start = 0;
    let first = true;
    let previousEnd = 0;

    do {
      while (start < content.length && /\s/.test(content[start])) start += 1;
      const end = cutPoint(content, start);
      const slice = content.slice(start, end);
      // Only push pages that have actual content (or are the first page of a chapter with a photo)
      if (slice.trim() || (first && chapter.photo) || figures.some((img) => img.offset >= previousEnd && (img.offset < end || end >= content.length))) {
        pages.push({
          chapterIndex,
          chapterId: chapter.id,
          opensChapter: first,
          continues: !first && !/\n\s*\n/.test(content.slice(previousEnd, start)),
          start,
          content: slice,
          marks: marksFor(chapter.marks, start, end),
          photo: first ? chapter.photo : null,
          images: figures.filter((image) => image.offset >= previousEnd && (image.offset < end || end >= content.length)),
        });
        first = false;
      }
      previousEnd = end;
      start = end;
    } while (start < content.length);

    // If we skipped all content (e.g. chapter is only whitespace but has no photo/images),
    // add a placeholder so the chapter is still navigable
    if (first) {
      pages.push({
        chapterIndex,
        chapterId: chapter.id,
        opensChapter: true,
        continues: false,
        start: 0,
        content: '',
        marks: [],
        photo: chapter.photo || null,
        images: figures,
        empty: true,
      });
    }
  });

  // Always return at least one page
  if (pages.length === 0) {
    pages.push({
      chapterIndex: 0,
      chapterId: chapters[0]?.id || 'empty',
      opensChapter: true,
      continues: false,
      start: 0,
      content: '',
      marks: [],
      photo: null,
      images: [],
      empty: true,
    });
  }

  return pages;
}
