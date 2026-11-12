import { storage } from './storage';
import { fetchFullTextInBackground } from './googleImport';
import { importProgress } from './importProgress';
import { accessInfo } from './catalog/availability';
import { genreLabel } from './catalog/genres';
import { normalize } from './catalog/text';
import { bookWorkId } from './catalog/identity';

export const workIdOf = bookWorkId;

export function catalogMeta(work) {
  const best = work.best;
  const edition = work.bestEdition;
  return {
    workId: work.id,
    source: best.source,
    sourceId: best.sourceId,
    url: best.url || null,
    access: { level: best.access.level, label: accessInfo(best.access.level).label, inApp: best.access.inApp },
    language: edition?.language || work.languages[0] || null,
    year: edition?.year || work.firstYear || null,
    genres: work.genres || [],
    subjects: (work.subjects || []).slice(0, 8),
    isbns: (edition?.isbns || []).slice(0, 4),
    addedFrom: 'descobrir',
  };
}

export async function findInLibrary(work) {
  const [shelf, chest] = await Promise.all([
    storage.getBooks(0).catch(() => []),
    storage.getChestBooks(0).catch(() => []),
  ]);
  const wanted = normalize(work.title);
  return [...shelf, ...chest].find((b) => workIdOf(b) === work.id || normalize(b.title) === wanted) || null;
}

export async function addWorkToLibrary(work) {
  const existing = await findInLibrary(work);
  if (existing) return { status: 'exists', book: existing };

  const offerWithText = work.editions.flatMap((e) => e.offers).find((o) => o.source === 'gutenberg' && o.gutenbergId);
  const gutenbergId = work.best.source === 'gutenberg' ? work.best.gutenbergId : offerWithText?.gutenbergId || null;
  const byline = work.authors.join(', ');
  const category = work.genres?.[0] ? genreLabel(work.genres[0]) : 'Literatura';
  if (!gutenbergId) return { status: 'unreadable', book: null };
  const meta = catalogMeta(work);

  const book = await storage.addBook({
    title: work.title,
    subtitle: byline ? `Por ${byline}` : '',
    category,
    coverImage: work.cover,
    paperColor: '#EFE2C4',
    fontFamily: 'serif',
    totalPages: work.bestEdition?.pageCount || undefined,
    isOwn: false,
    textPending: gutenbergId,
    catalog: meta,
    chapters: [
      {
        id: `chap-${Date.now()}-1`,
        title: work.description ? 'Sinopse' : 'Capítulo 1',
        content: work.description || 'O texto completo está sendo baixado.',
      },
    ],
  });


  const download = fetchFullTextInBackground(book.id, book.title, byline, gutenbergId).then(async (result) => {
    if (result !== 'failed') return result;
    await storage.deleteBookPermanently(book.id);
    importProgress.finish(book.id);
    return 'failed';
  });
  return { status: 'added', book, text: 'downloading', download };
}
