import { storage } from './storage';
import { fetchFullTextInBackground } from './googleImport';
import { importProgress } from './importProgress';
import { accessInfo } from './catalog/availability';
import { genreLabel } from './catalog/genres';
import { authorKey, normalize, titleKey } from './catalog/text';

export function workIdOf(book) {
  if (book.catalog?.workId) return book.catalog.workId;
  const byline = String(book.subtitle || '').replace(/^Por\s+/i, '');
  return `w:${titleKey(book.title).replace(/ /g, '-')}:${authorKey(byline) || 'anon'}`;
}

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
  const meta = catalogMeta(work);

  const placeholder = gutenbergId
    ? 'O texto completo está sendo baixado.'
    : work.best.url
      ? 'Este livro foi adicionado pela busca, mas o texto não pode ser lido aqui. A leitura abre na plataforma de origem, indicada nos detalhes do livro.'
      : 'Livro adicionado pela busca. Esta obra não traz o texto; use o botão de comentários no leitor para fazer suas anotações.';

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
        content: work.description || placeholder,
      },
    ],
  });

  if (!gutenbergId) return { status: 'added', book, text: 'none' };

  const download = fetchFullTextInBackground(book.id, book.title, byline, gutenbergId).then(async (result) => {
    if (result !== 'failed') return result;
    await storage.deleteBookPermanently(book.id);
    importProgress.finish(book.id);
    return 'failed';
  });
  return { status: 'added', book, text: 'downloading', download };
}
