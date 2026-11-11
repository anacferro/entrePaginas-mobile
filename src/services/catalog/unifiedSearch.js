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

export function languageList(input) {
  const list = Array.isArray(input.languages) ? input.languages : [];
  const all = input.language ? [input.language, ...list] : list;
  return [...new Set(all.filter(Boolean))];
}

function matchesFilters(work, filters) {
  const { languages = [], yearFrom, yearTo, genre, author, availability } = filters;
  if (languages.length && work.languages.length && !work.languages.some((l) => languages.includes(l))) return false;
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

  async function gather(params, only, languages = []) {
    const active = sources.filter((s) => !only || only.includes(s.id));
    const variants = languages.length ? languages.map((language) => ({ ...params, language })) : [{ ...params, language: null }];
    const jobs = active.flatMap((s) => variants.map((p) => ({ source: s, params: p })));
    const settled = await Promise.allSettled(jobs.map((j) => runSource(j.source, j.params)));
    const statuses = active.map((s) => {
      const mine = settled.filter((_, i) => jobs[i].source.id === s.id);
      const done = mine.filter((r) => r.status === 'fulfilled');
      if (done.length) {
        return {
          source: s.id,
          label: SOURCE_LABELS[s.id],
          ok: true,
          count: done.reduce((n, r) => n + r.value.records.length, 0),
          ms: Math.max(...done.map((r) => r.value.ms)),
          cached: done.every((r) => r.value.cached),
          error: null,
        };
      }
      return { source: s.id, label: SOURCE_LABELS[s.id], ok: false, count: 0, ms: 0, cached: false, error: describeError(mine[0].reason) };
    });
    const records = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value.records : []));
    return { records, statuses };
  }

  async function search(input = {}) {
    const { query = '', title, author, genre, yearFrom, yearTo, availability = 'any', page = 1, sources: only } = input;
    const languages = languageList(input);
    const text = [query, title].filter(Boolean).join(' ').trim();
    const params = { query: text, author: author || null, subject: !text && genre ? GENRES.find((g) => g.key === genre)?.words[0] || genre : null, page, limit: 20 };
    const { records, statuses } = await gather(params, only, languages);
    const works = rankWorks(groupWorks(records), text).filter((w) =>
      matchesFilters(w, { languages, yearFrom, yearTo, genre, author, availability })
    );
    const outcome = {
      works,
      statuses,
      failed: statuses.filter((s) => !s.ok),
      allFailed: statuses.length > 0 && statuses.every((s) => !s.ok),
      page,
    };
    history?.record({ at: new Date(now()).toISOString(), kind: 'search', query: text, filters: { languages, genre, author, yearFrom, yearTo, availability }, statuses: statuses.map(({ source, ok, count, ms, cached, error }) => ({ source, ok, count, ms, cached, error })) });
    return outcome;
  }

  async function browse(input = {}) {
    const { subject, query = '', page = 1, offset = 0, only } = input;
    const languages = languageList(input);
    const params = { query, subject: subject || null, page, offset, limit: 20, freeOnly: true };
    const { records, statuses } = await gather(params, only, languages);
    const works = rankWorks(groupWorks(records), query).filter((w) =>
      w.editions.some((e) => isFree(e.best.access.level)) && matchesFilters(w, { languages })
    );
    history?.record({ at: new Date(now()).toISOString(), kind: 'browse', query: subject || query, filters: { languages }, statuses: statuses.map(({ source, ok, count, ms, cached, error }) => ({ source, ok, count, ms, cached, error })) });
    return { works, statuses, failed: statuses.filter((s) => !s.ok), allFailed: statuses.length > 0 && statuses.every((s) => !s.ok) };
  }

  return { search, browse, clearCache: () => cache.clear(), historyLimit: HISTORY_LIMIT };
}
