import { ALL_SOURCES, SOURCE_LABELS } from './sources.js';
import { groupWorks } from './dedupe.js';
import { accessInfo, isFree } from './availability.js';
import { describeError } from './http.js';
import { authorKey, normalize } from './text.js';
import { GENRES } from './genres.js';

const TTL_MS = 10 * 60 * 1000;
const SOURCE_TIMEOUT_MS = 8000;
const HISTORY_LIMIT = 60;

export function relevance(work, query) {
  const wanted = normalize(query);
  if (!wanted) return 0;
  const title = normalize(work.title);
  const authors = normalize(work.authors.join(' '));
  const words = wanted.split(' ').filter((w) => w.length > 2);
  if (title === wanted) return 100;
  if (title.startsWith(wanted)) return 60;
  if (words.length && words.every((w) => title.includes(w))) return 40;
  if (words.length && words.every((w) => `${title} ${authors}`.includes(w))) return 20;
  return 0;
}

function matchesFilters(work, filters) {
  const { language, yearFrom, yearTo, genre, author, availability } = filters;
  if (language && work.languages.length && !work.languages.includes(language)) return false;
  if (yearFrom || yearTo) {
    const years = [work.firstYear, ...work.editions.map((e) => e.year)].filter(Boolean);
    if (!years.length) return false;
    const year = Math.min(...years);
    if (yearFrom && year < yearFrom) return false;
    if (yearTo && year > yearTo) return false;
  }
  if (genre) {
    const text = normalize(`${work.subjects.join(' ')} ${work.title}`);
    if (!work.genres.includes(genre) && !text.includes(normalize(genre))) return false;
  }
  if (author) {
    const wanted = normalize(author);
    if (!normalize(work.authors.join(' ')).includes(wanted) && authorKey(work.authors) !== authorKey(author)) return false;
  }
  if (availability === 'free' && !work.editions.some((e) => isFree(e.best.access.level))) return false;
  if (availability === 'inapp' && !work.editions.some((e) => e.best.access.inApp)) return false;
  return true;
}

function rankWorks(works, query) {
  const keyed = works.map((work, index) => {
    const rel = relevance(work, query);
    return {
      work,
      index,
      bucket: rel >= 40 ? 2 : rel >= 15 ? 1 : 0,
      free: work.editions.some((e) => isFree(e.best.access.level)) ? 1 : 0,
      rank: accessInfo(work.best.access.level).rank + (work.best.access.inApp ? 20 : 0),
      rel,
    };
  });
  keyed.sort((a, b) => b.bucket - a.bucket || b.free - a.free || b.rel - a.rel || b.rank - a.rank || a.index - b.index);
  return keyed.map((k) => k.work);
}

export function createCatalog({ sources = ALL_SOURCES, fetchImpl, now = () => Date.now(), history } = {}) {
  const cache = new Map();
  const flights = new Map();

  async function runSource(source, params) {
    const key = `${source.id}|${JSON.stringify(params)}`;
    const hit = cache.get(key);
    if (hit && now() - hit.at < TTL_MS) return { records: hit.records, cached: true, ms: 0 };
    if (flights.has(key)) return flights.get(key);
    const started = now();
    const flight = source
      .search(params, { timeoutMs: SOURCE_TIMEOUT_MS, retries: 1, fetchImpl })
      .then((records) => {
        cache.set(key, { at: now(), records });
        return { records, cached: false, ms: now() - started };
      })
      .finally(() => flights.delete(key));
    flights.set(key, flight);
    return flight;
  }

  async function gather(params, only) {
    const active = sources.filter((s) => !only || only.includes(s.id));
    const settled = await Promise.allSettled(active.map((s) => runSource(s, params)));
    const statuses = settled.map((result, i) => {
      const id = active[i].id;
      if (result.status === 'fulfilled') {
        return { source: id, label: SOURCE_LABELS[id], ok: true, count: result.value.records.length, ms: result.value.ms, cached: result.value.cached, error: null };
      }
      return { source: id, label: SOURCE_LABELS[id], ok: false, count: 0, ms: 0, cached: false, error: describeError(result.reason) };
    });
    const records = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value.records : []));
    return { records, statuses };
  }

  async function search(input = {}) {
    const { query = '', title, author, genre, language, yearFrom, yearTo, availability = 'any', page = 1, sources: only } = input;
    const text = [query, title].filter(Boolean).join(' ').trim();
    const params = { query: text, language: language || null, author: author || null, subject: !text && genre ? GENRES.find((g) => g.key === genre)?.words[0] || genre : null, page, limit: 20 };
    const { records, statuses } = await gather(params, only);
    const works = rankWorks(groupWorks(records), text).filter((w) =>
      matchesFilters(w, { language, yearFrom, yearTo, genre, author, availability })
    );
    const outcome = {
      works,
      statuses,
      failed: statuses.filter((s) => !s.ok),
      allFailed: statuses.length > 0 && statuses.every((s) => !s.ok),
      page,
    };
    history?.record({ at: new Date(now()).toISOString(), kind: 'search', query: text, filters: { language, genre, author, yearFrom, yearTo, availability }, statuses: statuses.map(({ source, ok, count, ms, cached, error }) => ({ source, ok, count, ms, cached, error })) });
    return outcome;
  }

  async function browse(input = {}) {
    const { subject, language, query = '', page = 1, offset = 0, only } = input;
    const params = { query, language: language || null, subject: subject || null, page, offset, limit: 20, freeOnly: true };
    const { records, statuses } = await gather(params, only);
    const works = rankWorks(groupWorks(records), query).filter((w) =>
      w.editions.some((e) => isFree(e.best.access.level)) && matchesFilters(w, { language })
    );
    history?.record({ at: new Date(now()).toISOString(), kind: 'browse', query: subject || query, filters: { language }, statuses: statuses.map(({ source, ok, count, ms, cached, error }) => ({ source, ok, count, ms, cached, error })) });
    return { works, statuses, failed: statuses.filter((s) => !s.ok), allFailed: statuses.length > 0 && statuses.every((s) => !s.ok) };
  }

  return { search, browse, clearCache: () => cache.clear(), historyLimit: HISTORY_LIMIT };
}
