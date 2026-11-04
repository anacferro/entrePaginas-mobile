import { publicDomain, normalize } from './publicDomain';

const GOOGLE_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_ENDPOINT = 'https://openlibrary.org/search.json';
const TIMEOUT_MS = 10000;
const MAX_RESULTS = 15;

const LANGUAGES = {
  Portuguese: 'Português',
  English: 'Inglês',
  Spanish: 'Espanhol',
  French: 'Francês',
  German: 'Alemão',
  Italian: 'Italiano',
  Latin: 'Latim',
};

function secureUrl(url) {
  return url ? url.replace(/^http:/, 'https:') : null;
}

function fromGoogle(item) {
  const info = item.volumeInfo || {};
  return {
    id: item.id,
    title: info.title || 'Sem título',
    authors: (info.authors || []).join(', '),
    description: info.description || '',
    category: info.categories?.[0] || null,
    pageCount: info.pageCount || null,
    thumbnail: secureUrl(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
  };
}

function fromOpenLibrary(doc) {
  return {
    id: doc.key,
    title: doc.title || 'Sem título',
    authors: (doc.author_name || []).slice(0, 3).join(', '),
    description: '',
    category: doc.subject?.[0] || null,
    pageCount: doc.number_of_pages_median || null,
    thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
  };
}

async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function searchGoogle(term) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const url =
    `${GOOGLE_ENDPOINT}?q=${encodeURIComponent(term)}&maxResults=8&printType=books` +
    (key ? `&key=${key}` : '');
  const response = await request(url);
  if (!response.ok) {
    const error = new Error('google-unavailable');
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return (data.items || []).map(fromGoogle);
}

async function searchOpenLibrary(term) {
  const fields = 'key,title,author_name,number_of_pages_median,subject,cover_i';
  const response = await request(
    `${OPEN_LIBRARY_ENDPOINT}?q=${encodeURIComponent(term)}&limit=8&fields=${fields}`
  );
  if (!response.ok) throw new Error('open-library-unavailable');
  const data = await response.json();
  return (data.docs || []).map(fromOpenLibrary);
}

async function searchPublicDomain(term) {
  const entries = await publicDomain.search(term);
  return entries.map(entry => ({
    id: `pg-${entry.id}`,
    title: entry.title,
    authors: entry.author,
    description: '',
    category: null,
    pageCount: null,
    thumbnail: `https://www.gutenberg.org/cache/epub/${entry.id}/pg${entry.id}.cover.medium.jpg`,
    gutenbergId: entry.id,
    language: LANGUAGES[entry.language] || entry.language,
  }));
}

async function searchCatalogs(term) {
  const errors = [];
  for (const source of [searchGoogle, searchOpenLibrary]) {
    try {
      const books = await source(term);
      const matched = await Promise.all(
        books.map(async (book) => {
          const entry = await publicDomain.findEntry(book.title, book.authors);
          return entry ? { ...book, gutenbergId: entry.id } : null;
        })
      );
      return matched.filter(Boolean);
    } catch (error) {
      errors.push(error);
    }
  }
  const failure = new Error('catalogs-unavailable');
  failure.errors = errors;
  throw failure;
}

function relevance(book, term) {
  const wanted = normalize(term);
  const title = normalize(book.title);
  const authors = normalize(book.authors);
  const words = wanted.split(' ').filter(word => word.length > 2);
  let score = 0;
  if (title === authors) return score;
  if (title === wanted) score += 100;
  else if (title.startsWith(wanted)) score += 60;
  else if (words.length && words.every(word => title.includes(word))) score += 40;
  else if (words.length && words.every(word => `${title} ${authors}`.includes(word))) score += 15;
  if (book.language === 'Português') score += 5;
  return score;
}

function merge(direct, catalog, term) {
  const byId = new Map();
  direct.forEach(book => byId.set(book.gutenbergId, book));

  catalog.forEach((book) => {
    const existing = byId.get(book.gutenbergId);
    if (!existing) {
      byId.set(book.gutenbergId, book);
      return;
    }
    byId.set(book.gutenbergId, {
      ...existing,
      thumbnail: book.thumbnail || existing.thumbnail,
      description: book.description || existing.description,
      category: book.category || existing.category,
      pageCount: book.pageCount || existing.pageCount,
    });
  });

  const seen = new Set();
  return [...byId.values()]
    .map((book, index) => ({ book, index, score: relevance(book, term) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.book)
    .filter((book) => {
      const key = `${normalize(book.title)}|${normalize(book.authors)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS);
}

function failureMessage(errors) {
  if (errors.some(e => e?.name === 'AbortError')) {
    return 'A consulta demorou demais. Verifique a conexão e tente novamente.';
  }
  if (errors.some(e => e instanceof TypeError)) {
    return 'Não foi possível conectar. Verifique a conexão com a internet.';
  }
  return 'As buscas de livros estão indisponíveis agora. Tente novamente em instantes ou preencha manualmente.';
}

export const googleBooks = {
  async search(query) {
    const term = query.trim();
    if (!term) return [];

    const [direct, catalog] = await Promise.allSettled([searchPublicDomain(term), searchCatalogs(term)]);

    if (direct.status === 'rejected' && catalog.status === 'rejected') {
      throw new Error(failureMessage([direct.reason, ...(catalog.reason?.errors || [])]));
    }

    return merge(
      direct.status === 'fulfilled' ? direct.value : [],
      catalog.status === 'fulfilled' ? catalog.value : [],
      term
    );
  },
};
