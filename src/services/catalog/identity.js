import { authorKey, titleKey } from './text.js';

export function workIdFor(title, authors) {
  return `w:${titleKey(title).replace(/ /g, '-')}:${authorKey(authors) || 'anon'}`;
}

export function bookWorkId(book) {
  if (book.catalog?.workId) return book.catalog.workId;
  const byline = String(book.subtitle || '').replace(/^Por\s+/i, '');
  return workIdFor(book.title, byline);
}

export function bookAuthors(book) {
  const byline = String(book.subtitle || '');
  if (!/^Por\s+/i.test(byline)) return [];
  return byline.replace(/^Por\s+/i, '').split(/,\s*/).filter(Boolean);
}
