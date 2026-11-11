import { authorKey, authorFull, isbnKey, titleKey } from './text.js';
import { bestOffer, accessInfo } from './availability.js';

class Union {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(i) {
    let root = i;
    while (this.parent[root] !== root) root = this.parent[root];
    let cur = i;
    while (this.parent[cur] !== root) {
      const next = this.parent[cur];
      this.parent[cur] = root;
      cur = next;
    }
    return root;
  }

  join(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

function isbnSet(record) {
  return new Set((record.isbns || []).map(isbnKey).filter(Boolean));
}

function sharesIsbn(a, b) {
  const setB = isbnSet(b);
  for (const isbn of isbnSet(a)) if (setB.has(isbn)) return true;
  return false;
}

function sameEditionData(a, b) {
  if (sharesIsbn(a, b)) return { same: true, confidence: 1 };
  if (a.source === b.source && a.sourceId === b.sourceId) return { same: true, confidence: 1 };
  const langA = a.language || null;
  const langB = b.language || null;
  if (langA && langB && langA !== langB) return { same: false, confidence: 0 };
  if (a.year && b.year && a.year !== b.year) return { same: false, confidence: 0 };
  if (isbnSet(a).size && isbnSet(b).size) return { same: false, confidence: 0 };
  const sameTitle = titleKey(a.title) === titleKey(b.title);
  const fullA = authorFull(a.authors);
  const fullB = authorFull(b.authors);
  const sameAuthor = fullA && fullB && (fullA === fullB || authorKey(a.authors) === authorKey(b.authors));
  if (!sameTitle || !sameAuthor) return { same: false, confidence: 0 };
  const bothYears = a.year && b.year;
  const bothLang = langA && langB;
  if (bothYears && bothLang) return { same: true, confidence: 0.9 };
  if (bothLang) return { same: true, confidence: 0.78 };
  return { same: true, confidence: 0.7 };
}

function sameWork(a, b) {
  if (sharesIsbn(a, b)) return { same: true, confidence: 1 };
  const ta = titleKey(a.title);
  const tb = titleKey(b.title);
  if (!ta || ta !== tb) return { same: false, confidence: 0 };
  const ka = authorKey(a.authors);
  const kb = authorKey(b.authors);
  if (ka && kb) return ka === kb ? { same: true, confidence: 0.85 } : { same: false, confidence: 0 };
  return { same: true, confidence: 0.6 };
}

function offerOf(record) {
  return {
    source: record.source,
    sourceId: record.sourceId,
    url: record.url || null,
    access: record.access,
    cover: record.cover || null,
    gutenbergId: record.gutenbergId || null,
    iaId: record.iaId || null,
  };
}

function pick(records, field) {
  return records.map((r) => r[field]).find((v) => (Array.isArray(v) ? v.length : v)) || null;
}

function buildEdition(records, confidence) {
  const offers = records.map(offerOf);
  const best = bestOffer(offers);
  const isbns = [...new Set(records.flatMap((r) => (r.isbns || []).map(isbnKey).filter(Boolean)))];
  return {
    id: `${records[0].source}:${records[0].sourceId}`,
    title: records[0].title,
    language: pick(records, 'language'),
    year: pick(records, 'year'),
    publisher: pick(records, 'publisher'),
    pageCount: pick(records, 'pageCount'),
    isbns,
    cover: pick(records, 'cover'),
    description: pick(records, 'description'),
    confidence,
    offers,
    best,
    sources: [...new Set(records.map((r) => r.source))],
  };
}

function groupEditions(records) {
  const union = new Union(records.length);
  const conf = new Map();
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const result = sameEditionData(records[i], records[j]);
      if (result.same) {
        union.join(i, j);
        const root = union.find(i);
        conf.set(root, Math.min(conf.get(root) ?? 1, result.confidence));
      }
    }
  }
  const groups = new Map();
  records.forEach((record, index) => {
    const root = union.find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(record);
  });
  return [...groups.entries()].map(([root, list]) => buildEdition(list, list.length > 1 ? conf.get(union.find(root)) ?? 0.7 : 1));
}

function workScore(work) {
  const free = work.editions.some((e) => accessInfo(e.best.access.level).free) ? 1000 : 0;
  const rank = accessInfo(work.best.access.level).rank;
  const inApp = work.best.access.inApp ? 20 : 0;
  return free + rank + inApp + work.editions.length;
}

export function groupWorks(records) {
  const union = new Union(records.length);
  const conf = new Map();
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const result = sameWork(records[i], records[j]);
      if (result.same) {
        union.join(i, j);
        const root = union.find(i);
        conf.set(root, Math.min(conf.get(root) ?? 1, result.confidence));
      }
    }
  }
  const groups = new Map();
  records.forEach((record, index) => {
    const root = union.find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(record);
  });

  const works = [...groups.entries()].map(([root, list]) => {
    const editions = groupEditions(list).sort((a, b) => accessInfo(b.best.access.level).rank - accessInfo(a.best.access.level).rank);
    const best = bestOffer(editions.map((e) => e.best));
    const bestEdition = editions.find((e) => e.best === best) || editions[0];
    const authors = list.find((r) => r.authors?.length)?.authors || [];
    const subjects = [...new Set(list.flatMap((r) => r.subjects || []))].slice(0, 12);
    return {
      id: `w:${titleKey(list[0].title).replace(/ /g, '-')}:${authorKey(authors) || 'anon'}`,
      title: bestEdition.title || list[0].title,
      authors,
      subjects,
      genres: [...new Set(list.flatMap((r) => r.genres || []))].slice(0, 2),
      cover: bestEdition.cover || pick(editions, 'cover'),
      description: pick(editions, 'description'),
      firstYear: list.map((r) => r.year).filter(Boolean).sort((a, b) => a - b)[0] || null,
      languages: [...new Set(editions.map((e) => e.language).filter(Boolean))],
      editions,
      best,
      bestEdition,
      confidence: list.length > 1 ? conf.get(union.find(root)) ?? 0.7 : 1,
      sources: [...new Set(list.map((r) => r.source))],
    };
  });

  return works.sort((a, b) => workScore(b) - workScore(a));
}
