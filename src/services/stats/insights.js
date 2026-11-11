import { genresForBook, ASPECTS, TRAITS } from '../personal.js';
import { bookAuthors, bookWorkId } from '../catalog/identity.js';
import { genreLabel, GENRES } from '../catalog/genres.js';
import { languageLabel } from '../catalog/languages.js';

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const MIN_SECONDS_FOR_HOURS = 600;

export function isValidDay(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return dayKey(parseDay(text)) === text;
}

export function statusFor(book, positions, entry) {
  if (entry?.finishedAt) return 'lido';
  if (entry?.abandonedAt) return 'abandonado';
  if (entry || (positions?.[book.id] || 1) > 1) return 'lendo';
  return 'planejado';
}

function dayPages(log, ids) {
  const out = new Map();
  Object.keys(log.days || {}).forEach((key) => {
    let pages = 0;
    let seconds = 0;
    Object.entries(log.days[key]).forEach(([id, v]) => {
      if (ids && !ids.has(id)) return;
      pages += v.pages || 0;
      seconds += v.seconds || 0;
    });
    if (pages > 0 || seconds > 0) out.set(key, { pages, seconds });
  });
  return out;
}

export function streaks(log, ids, now) {
  const days = [...dayPages(log, ids).entries()].filter(([, v]) => v.pages > 0).map(([k]) => k).sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  days.forEach((key) => {
    run = prev && dayKey(addDays(prev, 1)) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = parseDay(key);
  });
  const set = new Set(days);
  const today = startOfDay(now);
  let cursor = set.has(dayKey(today)) ? today : set.has(dayKey(addDays(today, -1))) ? addDays(today, -1) : null;
  let current = 0;
  while (cursor && set.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { longest, current, readingDays: days.length };
}

export function buckets(granularity, from, to) {
  const list = [];
  const end = startOfDay(to);
  if (granularity === 'day') {
    for (let d = startOfDay(from); d <= end; d = addDays(d, 1)) list.push({ key: dayKey(d), label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, start: d, end: addDays(d, 1) });
  } else if (granularity === 'week') {
    for (let d = startOfWeek(from); d <= end; d = addDays(d, 7)) list.push({ key: dayKey(d), label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, start: d, end: addDays(d, 7) });
  } else if (granularity === 'month') {
    for (let d = startOfMonth(from); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      list.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: MONTHS[d.getMonth()], start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) });
    }
  } else {
    for (let y = from.getFullYear(); y <= to.getFullYear(); y += 1) list.push({ key: String(y), label: String(y), start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) });
  }
  return list;
}

export function autoGranularity(from, to) {
  const days = Math.round((startOfDay(to) - startOfDay(from)) / 86400000) + 1;
  if (days <= 21) return 'day';
  if (days <= 140) return 'week';
  if (days <= 1100) return 'month';
  return 'year';
}

export function rangeFor(preset, now, custom) {
  const today = startOfDay(now);
  if (preset === 'week') return { granularity: 'week', from: addDays(startOfWeek(today), -77), to: today };
  if (preset === 'month') return { granularity: 'month', from: new Date(today.getFullYear(), today.getMonth() - 11, 1), to: today };
  if (preset === 'year') return { granularity: 'year', from: new Date(today.getFullYear() - 3, 0, 1), to: today };
  if (custom && isValidDay(custom.from) && isValidDay(custom.to) && custom.from <= custom.to) {
    const from = parseDay(custom.from);
    const to = parseDay(custom.to);
    return { granularity: autoGranularity(from, to), from, to };
  }
  return null;
}

export function booksOverTime({ books, log, range }) {
  const bs = buckets(range.granularity, range.from, range.to);
  const counts = bs.map((b) => ({ key: b.key, label: b.label, value: 0 }));
  books.forEach((book) => {
    const at = log.books?.[book.id]?.finishedAt;
    if (!at) return;
    const t = new Date(at);
    const i = bs.findIndex((b) => t >= b.start && t < b.end);
    if (i >= 0) counts[i].value += 1;
  });
  return counts;
}

export function pagesOverTime({ books, log, range }) {
  const days = dayPages(log, new Set(books.map((b) => b.id)));
  const bs = buckets(range.granularity, range.from, range.to);
  const out = bs.map((b) => ({ key: b.key, label: b.label, value: 0 }));
  days.forEach((v, key) => {
    const t = parseDay(key);
    const i = bs.findIndex((b) => t >= b.start && t < b.end);
    if (i >= 0) out[i].value += v.pages;
  });
  return out;
}

export function pagesPerMonth({ books, log, now, months = 12 }) {
  const range = { granularity: 'month', from: new Date(now.getFullYear(), now.getMonth() - (months - 1), 1), to: now };
  return pagesOverTime({ books, log, range });
}

export function calendar({ books, log, now, weeks = 26 }) {
  const days = dayPages(log, new Set(books.map((b) => b.id)));
  const today = startOfDay(now);
  const first = addDays(startOfWeek(today), -(weeks - 1) * 7);
  let max = 0;
  days.forEach((v) => { max = Math.max(max, v.pages); });
  const columns = [];
  const monthMarks = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w += 1) {
    const col = [];
    for (let r = 0; r < 7; r += 1) {
      const d = addDays(first, w * 7 + r);
      const key = dayKey(d);
      const pages = days.get(key)?.pages || 0;
      const future = d > today;
      col.push({ key, pages, future, level: future || pages === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((pages / Math.max(1, max)) * 4))) });
    }
    const m = addDays(first, w * 7).getMonth();
    if (m !== lastMonth) {
      monthMarks.push({ week: w, label: MONTHS[m] });
      lastMonth = m;
    }
    columns.push(col);
  }
  return { columns, monthMarks, max, activeDays: columns.flat().filter((c) => c.pages > 0).length };
}

function top(map, limit = 8) {
  return [...map.entries()].map(([key, v]) => ({ key, label: v.label, count: v.count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

function bump(map, key, label) {
  const row = map.get(key) || { label, count: 0 };
  row.count += 1;
  map.set(key, row);
}

const SOURCE_TYPE = { gutenberg: 'Project Gutenberg', openlibrary: 'Open Library', internetarchive: 'Internet Archive', wikisource: 'Wikisource', google: 'Google Books' };

export function distributions({ books, positions, log, personal, scope = 'lidos' }) {
  const chosen = books.filter((b) => scope === 'todos' || statusFor(b, positions, log.books?.[b.id]) === 'lido');
  const genre = new Map();
  const author = new Map();
  const language = new Map();
  const decade = new Map();
  const type = new Map();
  const missing = { genre: 0, author: 0, language: 0, decade: 0 };
  chosen.forEach((book) => {
    const rating = personal?.ratings?.[bookWorkId(book)] || null;
    const g = genresForBook(book, rating)[0];
    if (g) bump(genre, g, genreLabel(g));
    else missing.genre += 1;
    const names = bookAuthors(book);
    if (names.length) names.forEach((name) => bump(author, name, name));
    else missing.author += 1;
    const l = book.catalog?.language;
    if (l) bump(language, l, languageLabel(l));
    else missing.language += 1;
    const y = book.catalog?.year;
    if (y) bump(decade, Math.floor(y / 10) * 10, `${Math.floor(y / 10) * 10}s`);
    else missing.decade += 1;
    const kind = book.isOwn ? 'Obra própria' : SOURCE_TYPE[book.catalog?.source] || 'Adicionado manualmente';
    bump(type, kind, kind);
  });
  return {
    scope,
    total: chosen.length,
    genre: top(genre),
    author: top(author),
    language: top(language),
    decade: top(decade, 12).sort((x, y) => Number(x.key) - Number(y.key)),
    type: top(type),
    missing,
    countryAvailable: false,
  };
}

export function indicators({ books, positions, log, personal, now }) {
  const ids = new Set(books.map((b) => b.id));
  const counts = { lido: 0, lendo: 0, abandonado: 0, planejado: 0 };
  const finishedPages = [];
  let pagesRead = 0;
  let seconds = 0;
  let unknownPages = 0;
  books.forEach((book) => {
    const entry = log.books?.[book.id];
    const status = statusFor(book, positions, entry);
    counts[status] += 1;
    pagesRead += entry?.credited || 0;
    seconds += entry?.seconds || 0;
    if (status === 'lido') {
      if (book.totalPages > 1) finishedPages.push(book.totalPages);
      else unknownPages += 1;
    }
  });
  const ratings = Object.values(personal?.ratings || {});
  const goal = log.goal && log.goal.year === now.getFullYear() ? log.goal : null;
  const finishedThisYear = books.filter((b) => {
    const at = log.books?.[b.id]?.finishedAt;
    return at && new Date(at).getFullYear() === now.getFullYear();
  }).length;
  return {
    finished: counts.lido,
    inProgress: counts.lendo,
    abandoned: counts.abandonado,
    planned: counts.planejado,
    added: books.length,
    pagesRead,
    avgPagesFinished: finishedPages.length ? Math.round(finishedPages.reduce((s, n) => s + n, 0) / finishedPages.length) : null,
    unknownPages,
    avgRating: ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : null,
    ratingCount: ratings.length,
    hours: seconds >= MIN_SECONDS_FOR_HOURS ? Math.round((seconds / 3600) * 10) / 10 : null,
    streak: streaks(log, ids, now),
    goal: goal ? { year: goal.year, target: goal.target, done: finishedThisYear, percent: Math.min(100, Math.round((finishedThisYear / goal.target) * 100)) } : null,
  };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function narrative({ books, positions, log, personal, now }) {
  const lines = [];
  const caveats = [];
  if (!books.length) return { lines, caveats: ['Ainda não há livros na sua biblioteca.'] };
  const ind = indicators({ books, positions, log, personal, now });

  const finishedIn = (y, m) => books.filter((b) => {
    const at = log.books?.[b.id]?.finishedAt;
    if (!at) return false;
    const t = new Date(at);
    return t.getFullYear() === y && t.getMonth() === m;
  }).length;
  const days = dayPages(log, new Set(books.map((b) => b.id)));
  const pagesIn = (y, m) => [...days.entries()].reduce((s, [k, v]) => {
    const t = parseDay(k);
    return t.getFullYear() === y && t.getMonth() === m ? s + v.pages : s;
  }, 0);
  const y = now.getFullYear();
  const m = now.getMonth();
  const prev = new Date(y, m - 1, 1);
  const thisPages = pagesIn(y, m);
  const prevPages = pagesIn(prev.getFullYear(), prev.getMonth());
  const thisBooks = finishedIn(y, m);
  const prevBooks = finishedIn(prev.getFullYear(), prev.getMonth());
  const prevName = MONTH_NAMES[prev.getMonth()];
  if (thisPages || thisBooks) {
    let line = `Em ${MONTH_NAMES[m]} você leu ${plural(thisPages, 'página', 'páginas')} e concluiu ${plural(thisBooks, 'livro', 'livros')}.`;
    if (prevPages || prevBooks) line += ` Em ${prevName} foram ${plural(prevPages, 'página', 'páginas')} e ${plural(prevBooks, 'livro', 'livros')}.`;
    lines.push(line);
  } else if (prevPages || prevBooks) {
    lines.push(`Em ${MONTH_NAMES[m]} ainda não há leitura registrada. Em ${prevName} foram ${plural(prevPages, 'página', 'páginas')} e ${plural(prevBooks, 'livro', 'livros')}.`);
  }

  const dist = distributions({ books, positions, log, personal, scope: 'lidos' });
  if (dist.genre.length) {
    const g = dist.genre[0];
    lines.push(`Entre os livros que você leu até o fim, o gênero mais frequente é ${g.label} (${plural(g.count, 'livro', 'livros')} de ${dist.total}).`);
    if (dist.missing.genre) caveats.push(`${plural(dist.missing.genre, 'livro lido não tem', 'livros lidos não têm')} gênero identificado e ficou fora da contagem por gênero.`);
  }

  const rated = Object.values(personal?.ratings || {});
  if (rated.length >= 3) {
    const high = rated.filter((r) => r.stars >= 4);
    const tally = new Map();
    high.forEach((r) => Object.entries(r.aspects || {}).forEach(([k, v]) => { if (v === true) tally.set(k, (tally.get(k) || 0) + 1); }));
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) {
      const label = (ASPECTS.find((a) => a.key === best[0])?.label || TRAITS.find((t) => t.key === best[0])?.label || best[0]).toLowerCase();
      lines.push(`Nos livros que você avaliou com 4 ou 5 estrelas, a marca mais repetida foi "${label}" (${best[1]} de ${high.length}).`);
    }
    lines.push(`Sua nota média é ${ind.avgRating.toFixed(1).replace('.', ',')} em ${plural(rated.length, 'livro avaliado', 'livros avaliados')}.`);
  } else if (rated.length) {
    caveats.push('Com menos de 3 avaliações ainda não dá para ligar notas a características dos livros.');
  }

  const read = new Set(books.filter((b) => statusFor(b, positions, log.books?.[b.id]) !== 'planejado').flatMap((b) => genresForBook(b, personal?.ratings?.[bookWorkId(b)])));
  const unexplored = GENRES.filter((g) => !read.has(g.key)).slice(0, 4).map((g) => g.label);
  if (read.size && unexplored.length) lines.push(`Gêneros que você ainda não leu: ${unexplored.join(', ')}.`);

  if (ind.streak.longest >= 2) lines.push(`Sua maior sequência de leitura foi de ${plural(ind.streak.longest, 'dia', 'dias')} seguidos, em ${plural(ind.streak.readingDays, 'dia de leitura', 'dias de leitura')} no total.`);
  if (ind.finished + ind.abandoned < 5) caveats.push('Há poucos livros concluídos, então estes números ainda variam muito de um livro para outro.');
  if (ind.hours === null) caveats.push('O tempo de leitura só é mostrado depois de 10 minutos medidos no leitor.');
  if (ind.unknownPages) caveats.push(`${plural(ind.unknownPages, 'livro lido não tem', 'livros lidos não têm')} contagem de páginas e ficou fora da média de páginas.`);
  return { lines, caveats };
}
