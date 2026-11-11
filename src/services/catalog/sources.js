import { getJson, getText } from './http.js';
import { cleanAuthor, flipName, isbnKey, normalize, stripHtml, yearOf } from './text.js';
import { languageCode, languageIso3 } from './languages.js';
import { genresOf } from './genres.js';
import {
  classifyGoogle,
  classifyGutenberg,
  classifyInternetArchive,
  classifyOpenLibrary,
  classifyWikisource,
} from './availability.js';

export const SOURCE_LABELS = {
  gutenberg: 'Project Gutenberg',
  openlibrary: 'Open Library',
  internetarchive: 'Internet Archive',
  wikisource: 'Wikisource',
  google: 'Google Books',
};

const secure = (url) => (url ? String(url).replace(/^http:/, 'https:') : null);
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function withLanguage(record, requested, languages) {
  const known = (languages || []).map(languageCode).filter(Boolean);
  if (requested && known.includes(requested)) return { ...record, language: requested };
  if (known.length === 1) return { ...record, language: known[0] };
  return { ...record, language: null, languages: known };
}

function decode(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export function parseGutenbergFeed(xml) {
  const entries = [];
  const pattern = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = pattern.exec(xml))) {
    const body = match[1];
    const id = body.match(/\/ebooks\/(\d+)\.opds/)?.[1];
    const rawTitle = body.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const author = body.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || '';
    if (id && rawTitle) entries.push({ id, rawTitle: decode(rawTitle).trim(), author: decode(author).trim() });
  }
  return entries;
}

function fromGutenberg(entry) {
  const languageName = entry.rawTitle.match(/\(([^)]*)\)\s*$/)?.[1]?.trim();
  const title = entry.rawTitle.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*:\s+/g, ': ').trim();
  const author = /downloads?$/i.test(entry.author) ? '' : entry.author;
  const language = languageCode(languageName) || (languageName ? null : 'en');
  return {
    source: 'gutenberg',
    sourceId: entry.id,
    gutenbergId: entry.id,
    title,
    authors: author ? [cleanAuthor(author)] : [],
    language,
    year: null,
    isbns: [],
    subjects: [],
    genres: genresOf([], title),
    cover: `https://www.gutenberg.org/cache/epub/${entry.id}/pg${entry.id}.cover.medium.jpg`,
    url: `https://www.gutenberg.org/ebooks/${entry.id}`,
    access: classifyGutenberg(),
  };
}

export const gutenberg = {
  id: 'gutenberg',
  async search({ query, language, subject, limit = 25, offset = 0, sort }, ctx = {}) {
    const parts = [];
    if (query) parts.push(query.trim());
    if (subject) parts.push(`s.${subject.replace(/\s+/g, '+')}`);
    if (language) parts.push(`l.${language}`);
    if (!parts.length) return [];
    const extra = `${sort ? `&sort_order=${sort}` : ''}${offset ? `&start_index=${offset + 1}` : ''}`;
    const text = await getText(
      `https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(parts.join(' ')).replace(/%20/g, '+')}${extra}`,
      ctx
    );
    const words = normalize(query || '').split(' ').filter((w) => w.length > 2);
    return parseGutenbergFeed(text)
      .map(fromGutenberg)
      .filter((r) => !words.length || words.every((w) => normalize(`${r.title} ${r.authors.join(' ')}`).includes(w)))
      .slice(0, limit);
  },
};

const OL_FIELDS = [
  'key', 'title', 'subtitle', 'author_name', 'first_publish_year', 'language', 'ebook_access', 'ia', 'isbn', 'subject',
  'cover_i', 'publisher', 'public_scan_b', 'number_of_pages_median', 'has_fulltext',
].join(',');

export function fromOpenLibraryDoc(doc, requested) {
  const base = {
    source: 'openlibrary',
    sourceId: doc.key,
    title: [doc.title, doc.subtitle].filter(Boolean).join(': '),
    authors: list(doc.author_name).slice(0, 3).map(cleanAuthor),
    year: doc.first_publish_year || null,
    publisher: list(doc.publisher)[0] || null,
    pageCount: doc.number_of_pages_median || null,
    isbns: list(doc.isbn).map(isbnKey).filter(Boolean).slice(0, 8),
    subjects: list(doc.subject).slice(0, 12),
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    url: `https://openlibrary.org${doc.key}`,
    iaId: list(doc.ia)[0] || null,
    access: classifyOpenLibrary(doc),
  };
  base.genres = genresOf(base.subjects, base.title);
  return withLanguage(base, requested, doc.language);
}

export const openlibrary = {
  id: 'openlibrary',
  async search({ query, language, subject, author, limit = 25, page = 1, freeOnly }, ctx = {}) {
    const terms = [];
    if (query) terms.push(query.trim());
    if (subject) terms.push(`subject:"${subject}"`);
    if (author) terms.push(`author:"${author}"`);
    const q = terms.join(' ') || '*';
    const lang = language ? languageIso3(language) : null;
    const params = [
      `q=${encodeURIComponent(q)}`,
      `limit=${limit}`,
      `page=${page}`,
      `fields=${OL_FIELDS}`,
      lang ? `language=${lang}` : '',
      freeOnly ? 'has_fulltext=true' : '',
    ].filter(Boolean);
    const data = await getJson(`https://openlibrary.org/search.json?${params.join('&')}`, ctx);
    return list(data.docs).map((doc) => fromOpenLibraryDoc(doc, language));
  },
};

const IA_FIELDS = ['identifier', 'title', 'creator', 'year', 'language', 'collection', 'licenseurl', 'access-restricted-item', 'subject', 'format', 'downloads'];

export function fromInternetArchiveDoc(doc, requested) {
  const title = Array.isArray(doc.title) ? doc.title[0] : doc.title;
  const base = {
    source: 'internetarchive',
    sourceId: doc.identifier,
    iaId: doc.identifier,
    title: String(title || '').trim(),
    authors: list(doc.creator).slice(0, 3).map(cleanAuthor),
    year: yearOf(doc.year),
    isbns: [],
    subjects: list(doc.subject).slice(0, 12),
    cover: `https://archive.org/services/img/${doc.identifier}`,
    url: `https://archive.org/details/${doc.identifier}`,
    access: classifyInternetArchive(doc),
  };
  base.genres = genresOf(base.subjects, base.title);
  return withLanguage(base, requested, list(doc.language));
}

export const internetarchive = {
  id: 'internetarchive',
  async search({ query, language, subject, author, limit = 20, page = 1 }, ctx = {}) {
    const clauses = ['mediatype:texts', '-collection:(inlibrary OR lendinglibrary OR printdisabled)'];
    const text = (query || '').replace(/["():]/g, ' ').trim();
    if (text) clauses.push(`(title:(${text}) OR creator:(${text}))`);
    if (subject) clauses.push(`subject:("${subject.replace(/"/g, '')}")`);
    if (author) clauses.push(`creator:("${author.replace(/"/g, '')}")`);
    const lang = language ? languageIso3(language) : null;
    if (lang) clauses.push(`language:(${lang} OR ${language})`);
    const url =
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(clauses.join(' AND '))}` +
      IA_FIELDS.map((f) => `&fl%5B%5D=${f}`).join('') +
      `&sort%5B%5D=downloads+desc&rows=${limit}&page=${page}&output=json`;
    const data = await getJson(url, ctx);
    return list(data.response?.docs)
      .filter((doc) => doc.title)
      .map((doc) => fromInternetArchiveDoc(doc, language));
  },
};

export function fromWikisourceHit(hit) {
  const text = stripHtml(hit.snippet);
  const author = text.match(/\bpor\s+(.+?)\s+\d{3,}/i)?.[1] || '';
  const title = hit.title;
  return {
    source: 'wikisource',
    sourceId: String(hit.pageid),
    title,
    authors: author && author.length < 60 ? [cleanAuthor(author.split(/\s*,\s*editado/i)[0])] : [],
    language: 'pt',
    year: null,
    isbns: [],
    subjects: [],
    genres: genresOf([], title),
    cover: null,
    url: `https://pt.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    access: classifyWikisource(),
  };
}

export const wikisource = {
  id: 'wikisource',
  async search({ query, language, limit = 10 }, ctx = {}) {
    if (language && language !== 'pt') return [];
    if (!query) return [];
    const url =
      `https://pt.wikisource.org/w/api.php?action=query&list=search&format=json&origin=*&srnamespace=0` +
      `&srlimit=${limit}&srsearch=${encodeURIComponent(query)}`;
    const data = await getJson(url, ctx);
    return list(data.query?.search)
      .filter((hit) => !hit.title.includes('/'))
      .map(fromWikisourceHit);
  },
};

export function fromGoogleVolume(item, requested) {
  const info = item.volumeInfo || {};
  const ids = list(info.industryIdentifiers).map((i) => isbnKey(i.identifier)).filter(Boolean);
  const base = {
    source: 'google',
    sourceId: item.id,
    title: [info.title, info.subtitle].filter(Boolean).join(': ') || 'Sem título',
    authors: list(info.authors).slice(0, 3),
    year: yearOf(info.publishedDate),
    publisher: info.publisher || null,
    pageCount: info.pageCount || null,
    description: info.description ? stripHtml(info.description) : null,
    isbns: ids,
    subjects: list(info.categories),
    cover: secure(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
    url: secure(item.accessInfo?.webReaderLink || info.infoLink),
    access: classifyGoogle(item),
  };
  base.genres = genresOf(base.subjects, base.title);
  return withLanguage(base, requested, [info.language]);
}

export const google = {
  id: 'google',
  async search({ query, language, subject, author, limit = 20, page = 1, freeOnly }, ctx = {}) {
    const terms = [];
    if (query) terms.push(query.trim());
    if (subject) terms.push(`subject:${subject}`);
    if (author) terms.push(`inauthor:${author}`);
    if (!terms.length) return [];
    const key = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
    const params = [
      `q=${encodeURIComponent(terms.join(' '))}`,
      `maxResults=${Math.min(limit, 40)}`,
      `startIndex=${(page - 1) * limit}`,
      'printType=books',
      language ? `langRestrict=${language}` : '',
      freeOnly ? 'filter=free-ebooks' : '',
      key ? `key=${key}` : '',
    ].filter(Boolean);
    const data = await getJson(`https://www.googleapis.com/books/v1/volumes?${params.join('&')}`, ctx);
    return list(data.items).map((item) => fromGoogleVolume(item, language));
  },
};

export const ALL_SOURCES = [gutenberg, openlibrary, internetarchive, wikisource, google];
