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

export function paginate(chapters) {
  const pages = [];

  chapters.forEach((chapter, chapterIndex) => {
    const content = chapter.content || '';
    let start = 0;
    let first = true;
    let previousEnd = 0;
    const figures = (chapter.images || []).map((image) => ({ ...image, offset: Math.min(image.offset || 0, content.length) }));

    do {
      while (start < content.length && /\s/.test(content[start])) start += 1;
      const end = cutPoint(content, start);
      pages.push({
        chapterIndex,
        chapterId: chapter.id,
        opensChapter: first,
        continues: !first && !/\n\s*\n/.test(content.slice(previousEnd, start)),
        start,
        content: content.slice(start, end),
        marks: marksFor(chapter.marks, start, end),
        photo: first ? chapter.photo : null,
        images: figures.filter((image) => image.offset >= previousEnd && (image.offset < end || end >= content.length)),
      });
      first = false;
      previousEnd = end;
      start = end;
    } while (start < content.length);
  });

  return pages;
}
