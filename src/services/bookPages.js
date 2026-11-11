import { paginate } from './pagination';

const cache = new Map();

export function pageCountOf(book) {
  const chapters = book?.chapters;
  if (!chapters || chapters.length === 0) return Math.max(1, book?.totalPages || 1);
  const key = `${book.id}:${book.updatedAt || ''}:${chapters.length}`;
  if (!cache.has(key)) {
    cache.set(key, Math.max(1, paginate(chapters).length));
    if (cache.size > 200) cache.delete(cache.keys().next().value);
  }
  return cache.get(key);
}

export function withPageCounts(books) {
  return books.map((book) => ({ ...book, totalPages: pageCountOf(book) }));
}
