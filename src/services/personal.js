import { GENRES, genresOf } from './catalog/genres.js';
import { bookAuthors, bookWorkId } from './catalog/identity.js';
import { normalize } from './catalog/text.js';

export const TRAITS = [
  { key: 'personagens-complexos', label: 'Personagens complexos' },
  { key: 'mundos-construidos', label: 'Mundos bem construídos' },
  { key: 'narrativa-rapida', label: 'Narrativas rápidas' },
  { key: 'narrativa-lenta', label: 'Narrativas lentas e detalhadas' },
  { key: 'reviravoltas', label: 'Reviravoltas' },
  { key: 'psicologica', label: 'Histórias psicológicas' },
  { key: 'emocional', label: 'Desenvolvimento emocional' },
  { key: 'filosofica', label: 'Temas filosóficos' },
  { key: 'conflitos-morais', label: 'Conflitos morais' },
  { key: 'narrador-nao-confiavel', label: 'Narradores não confiáveis' },
  { key: 'final-aberto', label: 'Finais abertos' },
  { key: 'final-surpreendente', label: 'Finais surpreendentes' },
  { key: 'realista', label: 'Histórias realistas' },
  { key: 'imaginativa', label: 'Histórias imaginativas' },
];

export const ERAS = [
  { key: 'antiguidade', label: 'Antiguidade', from: -3000, to: 500 },
  { key: 'medieval', label: 'Idade Média', from: 500, to: 1500 },
  { key: 'moderna', label: 'Séculos XVI a XVIII', from: 1500, to: 1800 },
  { key: 'seculo-xix', label: 'Século XIX', from: 1800, to: 1900 },
  { key: 'modernismo', label: 'Início do século XX', from: 1900, to: 1950 },
  { key: 'contemporanea', label: 'Depois de 1950', from: 1950, to: 3000 },
];

export const LENGTHS = [
  { key: 'curto', label: 'Curtos' },
  { key: 'medio', label: 'Médios' },
  { key: 'longo', label: 'Longos' },
];

export const PERIODS = [
  { key: 'classico', label: 'Mais clássicos' },
  { key: 'contemporaneo', label: 'Mais contemporâneos' },
  { key: 'ambos', label: 'Os dois' },
];

export const ASPECTS = [
  { key: 'characters', label: 'Gostei dos personagens' },
  { key: 'plot', label: 'Gostei do desenvolvimento da história' },
  { key: 'style', label: 'Gostei do estilo de escrita' },
  { key: 'engaging', label: 'Achei a leitura envolvente' },
  { key: 'moreFromAuthor', label: 'Quero ler mais do mesmo autor' },
  { key: 'recommend', label: 'Recomendaria a alguém' },
];

export const emptyDeclared = () => ({
  genres: [],
  traits: [],
  favoriteAuthors: [],
  favoriteBooks: [],
  wantAuthors: [],
  languages: [],
  eras: [],
  topics: [],
  avoidTopics: [],
  length: null,
  period: null,
  notes: '',
});

export const emptyPersonal = () => ({
  version: 1,
  ratings: {},
  declared: emptyDeclared(),
  progress: { step: 0, skipped: [], updatedAt: null },
  recs: {},
  recFeedback: {},
  chat: [],
  settings: { useRatings: true, useHistory: true, useReviews: true },
});

const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v, max = 400) => String(v || '').slice(0, max);
const strList = (v, max = 30) => arr(v).map((x) => str(x, 80).trim()).filter(Boolean).slice(0, max);

export function normalizePersonal(raw) {
  const base = emptyPersonal();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw.declared || {};
  return {
    version: 1,
    ratings: raw.ratings && typeof raw.ratings === 'object' ? raw.ratings : {},
    declared: {
      genres: strList(d.genres),
      traits: strList(d.traits),
      favoriteAuthors: strList(d.favoriteAuthors),
      favoriteBooks: strList(d.favoriteBooks),
      wantAuthors: strList(d.wantAuthors),
      languages: strList(d.languages),
      eras: strList(d.eras),
      topics: strList(d.topics),
      avoidTopics: strList(d.avoidTopics),
      length: LENGTHS.some((l) => l.key === d.length) ? d.length : null,
      period: PERIODS.some((p) => p.key === d.period) ? d.period : null,
      notes: str(d.notes, 600),
    },
    progress: {
      step: Number.isFinite(raw.progress?.step) ? raw.progress.step : 0,
      skipped: strList(raw.progress?.skipped),
      updatedAt: raw.progress?.updatedAt || null,
    },
    recs: raw.recs && typeof raw.recs === 'object' ? raw.recs : {},
    recFeedback: raw.recFeedback && typeof raw.recFeedback === 'object' ? raw.recFeedback : {},
    chat: arr(raw.chat).slice(-60),
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}

export function setRating(personal, info, now = new Date()) {
  const stars = Math.max(1, Math.min(5, Math.round(info.stars)));
  const existing = personal.ratings[info.workId];
  personal.ratings[info.workId] = {
    workId: info.workId,
    bookId: info.bookId || existing?.bookId || null,
    title: str(info.title || existing?.title, 200),
    authors: strList(info.authors || existing?.authors, 4),
    genres: arr(info.genres || existing?.genres).slice(0, 3),
    language: info.language || existing?.language || null,
    year: info.year || existing?.year || null,
    pages: info.pages || existing?.pages || null,
    stars,
    aspects: existing?.aspects || {},
    liked: existing?.liked || '',
    disliked: existing?.disliked || '',
    review: existing?.review || '',
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };
  return personal;
}

export function setRatingDetails(personal, workId, patch, now = new Date()) {
  const current = personal.ratings[workId];
  if (!current) return personal;
  const aspects = { ...current.aspects, ...(patch.aspects || {}) };
  Object.keys(aspects).forEach((k) => {
    if (aspects[k] === undefined || aspects[k] === null) delete aspects[k];
  });
  personal.ratings[workId] = {
    ...current,
    aspects,
    liked: patch.liked !== undefined ? str(patch.liked, 300) : current.liked,
    disliked: patch.disliked !== undefined ? str(patch.disliked, 300) : current.disliked,
    review: patch.review !== undefined ? str(patch.review, 800) : current.review,
    updatedAt: now.toISOString(),
  };
  return personal;
}

export function removeRating(personal, workId) {
  delete personal.ratings[workId];
  return personal;
}

export function setDeclared(personal, patch, now = new Date()) {
  personal.declared = normalizePersonal({ declared: { ...personal.declared, ...patch } }).declared;
  personal.progress = { ...personal.progress, updatedAt: now.toISOString() };
  return personal;
}

const STAR_WEIGHT = { 5: 3, 4: 2, 3: 0.4, 2: -1.5, 1: -3 };

function lengthBucket(pages) {
  if (!pages) return null;
  if (pages < 150) return 'curto';
  if (pages < 400) return 'medio';
  return 'longo';
}

const CATEGORY_TO_GENRE = Object.fromEntries(GENRES.map((g) => [normalize(g.label), g.key]));

function genresForBook(book, rating) {
  if (rating?.genres?.length) return rating.genres;
  if (book.catalog?.genres?.length) return book.catalog.genres;
  const direct = CATEGORY_TO_GENRE[normalize(book.category)];
  if (direct) return [direct];
  return genresOf([book.category].filter(Boolean), '');
}

function add(map, key, weight, bookTitle) {
  if (!key) return;
  const row = map.get(key) || { key, score: 0, pos: 0, neg: 0, books: [] };
  row.score += weight;
  if (weight > 0) row.pos += 1;
  if (weight < 0) row.neg += 1;
  if (bookTitle && row.books.length < 4) row.books.push(bookTitle);
  map.set(key, row);
}

function ranked(map) {
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export function evidenceFor({ book, entry, status, rating, settings }) {
  const useRatings = settings.useRatings !== false && rating;
  if (status === 'lido') {
    if (useRatings) return { weight: STAR_WEIGHT[rating.stars], kind: 'lido-avaliado' };
    return { weight: 0.6, kind: 'lido' };
  }
  if (status === 'abandonado') {
    if (useRatings) return { weight: STAR_WEIGHT[rating.stars] * 0.6, kind: 'abandonado-avaliado' };
    return { weight: -0.8, kind: 'abandonado' };
  }
  if (status === 'lendo' && entry?.credited > 3) return { weight: 0.2, kind: 'lendo' };
  return { weight: 0, kind: 'adicionado' };
}

export function inferTaste({ books, statusOf, log, positions, personal }) {
  const { settings } = personal;
  const genres = new Map();
  const authors = new Map();
  const languages = new Map();
  const eras = new Map();
  const lengths = new Map();
  const traits = new Map();
  const counts = { finished: 0, rated: 0, abandoned: 0, reading: 0, added: 0 };

  books.forEach((book) => {
    const entry = log.books?.[book.id];
    const status = settings.useHistory === false ? 'planejado' : statusOf(book, positions?.[book.id] || 1, entry);
    const rating = personal.ratings[bookWorkId(book)] || null;
    const { weight, kind } = evidenceFor({ book, entry, status, rating, settings });
    if (kind.startsWith('lido')) counts.finished += 1;
    else if (kind.startsWith('abandonado')) counts.abandoned += 1;
    else if (kind === 'lendo') counts.reading += 1;
    else counts.added += 1;
    if (rating && settings.useRatings !== false) counts.rated += 1;
    if (!weight) return;

    genresForBook(book, rating).forEach((g) => add(genres, g, weight, book.title));
    bookAuthors(book).forEach((a) => add(authors, a, weight, book.title));
    if (book.catalog?.language) add(languages, book.catalog.language, weight, book.title);
    const year = book.catalog?.year;
    if (year) {
      const era = ERAS.find((e) => year >= e.from && year < e.to);
      if (era) add(eras, era.key, weight, book.title);
    }
    add(lengths, lengthBucket(book.totalPages), weight, book.title);

    if (rating && settings.useReviews !== false) {
      const a = rating.aspects || {};
      const good = rating.stars >= 4;
      const bad = rating.stars <= 2;
      if (a.characters === true && good) add(traits, 'personagens-complexos', 1, book.title);
      if (a.characters === false && bad) add(traits, 'personagens-complexos', -1, book.title);
      if (a.plot === true && good) add(traits, 'enredo-bem-desenvolvido', 1, book.title);
      if (a.plot === false) add(traits, 'enredo-bem-desenvolvido', -1, book.title);
      if (a.style === true && good) add(traits, 'estilo-de-escrita', 1, book.title);
      if (a.style === false) add(traits, 'estilo-de-escrita', -1, book.title);
      if (a.engaging === true) add(traits, 'leitura-envolvente', 1, book.title);
      if (a.surprise === 'surpreendente' && good) add(traits, 'reviravoltas', 1, book.title);
      if (a.surprise === 'previsivel' && !good) add(traits, 'previsibilidade', -1, book.title);
    }
  });

  const confidence = counts.finished >= 8 ? 'alta' : counts.finished >= 3 ? 'media' : 'baixa';
  const liked = (map) => ranked(map).filter((r) => r.score > 0.5);
  const disliked = (map) => ranked(map).filter((r) => r.score < -0.5).reverse();
  return {
    counts,
    confidence,
    sample: counts.finished + counts.abandoned,
    genres: { liked: liked(genres), disliked: disliked(genres), all: ranked(genres) },
    authors: { liked: liked(authors), disliked: disliked(authors) },
    languages: { liked: liked(languages) },
    eras: { liked: liked(eras) },
    lengths: { liked: liked(lengths) },
    traits: { liked: liked(traits), disliked: disliked(traits) },
  };
}

export function profileCompleteness(declared) {
  const parts = [
    declared.genres.length > 0,
    declared.traits.length > 0,
    declared.favoriteAuthors.length > 0 || declared.favoriteBooks.length > 0,
    declared.languages.length > 0,
    declared.eras.length > 0 || declared.period !== null,
    declared.topics.length > 0 || declared.avoidTopics.length > 0 || declared.length !== null,
  ];
  return { done: parts.filter(Boolean).length, total: parts.length };
}

export function exportPersonal(personal) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...personal }, null, 2);
}
