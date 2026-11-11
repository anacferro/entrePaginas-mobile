import { bookChapters, estimateBookPages } from '../book.js';

export function buildJson(doc, { title, subtitle, split = 'headings' } = {}) {
  const chapters = bookChapters(doc, { split });
  const data = {
    title: title || doc.title || 'Livro convertido',
    subtitle: subtitle || (doc.author ? `Por ${doc.author}` : 'Convertido de documento'),
    category: 'Literatura',
    totalPages: estimateBookPages(chapters),
    chapters: chapters.map((c) => ({ title: c.title, content: c.content, marks: c.marks })),
    bookmarks: [],
  };
  const text = JSON.stringify(data, null, 2);
  return {
    format: 'json',
    text,
    bytes: new TextEncoder().encode(text),
    mime: 'application/json',
    extension: 'json',
    pages: data.totalPages,
    chapters: chapters.length,
    warnings: [],
  };
}
