import { extractSentinelMarks } from '../htmlText.js';
import { chaptersOf, blocksToContent } from './model.js';

export function bookChapters(doc, { split = 'headings' } = {}) {
  const stamp = Date.now();
  return chaptersOf(doc, { split }).map((chapter, i) => {
    const { content, marks } = extractSentinelMarks(blocksToContent(chapter.blocks));
    return {
      id: `chap-${stamp}-${i + 1}`,
      title: chapter.title,
      content: content || chapter.title,
      marks: marks.map((m, k) => ({ ...m, id: `mark-${stamp}-${i + 1}-${k}` })),
    };
  });
}

export function estimateBookPages(chapters) {
  return Math.max(1, Math.ceil(chapters.reduce((n, c) => n + c.content.length, 0) / 1800));
}
