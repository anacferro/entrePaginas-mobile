import { publicDomain } from './publicDomain';
import { importer } from './importer';
import { importProgress } from './importProgress';
import { storage } from './storage';

const resumed = new Set();

export function resumePendingTexts(books) {
  books
    .filter(book => book.textPending && !resumed.has(book.id) && !importProgress.get(book.id))
    .forEach((book) => {
      resumed.add(book.id);
      fetchFullTextInBackground(book.id, book.title, '', book.textPending);
    });
}

export async function fetchFullTextInBackground(bookId, title, authors, gutenbergId) {
  importProgress.start(bookId);
  const timer = setInterval(() => importProgress.creep(bookId), 500);

  try {
    const text = await publicDomain.findFullText(title, authors, stage => importProgress.stage(bookId, stage), gutenbergId);
    if (!text) return 'failed';

    importProgress.stage(bookId, 'process');
    const updated = await storage.setBookContent(bookId, importer.fromGutenberg(text));
    return updated ? 'full' : 'gone';
  } catch {
    return 'failed';
  } finally {
    clearInterval(timer);
    importProgress.finish(bookId);
  }
}
