import { normalize } from '../catalog/text.js';
import { isFree, accessInfo } from '../catalog/availability.js';
import { GENRES, genreLabel } from '../catalog/genres.js';
import { languageLabel } from '../catalog/languages.js';

export const CATEGORIES = [
  { id: 'afinidade', title: 'Livros que combinam com você', hint: 'Escolhidos pelo que você declarou e pelo que leu e avaliou.', tag: 'Afinidade' },
  { id: 'horizontes', title: 'Explore novos horizontes', hint: 'Fora do que você costuma ler, sem fugir do que você evita.', tag: 'Novo horizonte' },
  { id: 'perspectiva', title: 'Uma perspectiva diferente', hint: 'Pontos de vista que contrastam com os seus temas. São leituras para pensar, não verdades.', tag: 'Outra perspectiva' },
  { id: 'autores', title: 'Autores para conhecer', hint: 'Nomes que você ainda não tem na estante.', tag: 'Descoberta' },
];

export const PERSPECTIVES = [
  { id: 'filosofia-empirismo', when: ['filosofia'], query: 'empiricism', title: 'Empirismo', note: 'Parte da experiência e da observação, em contraste com filosofias baseadas só na razão.' },
  { id: 'politica-liberdade', when: ['politica'], query: 'liberty essays', title: 'Ensaios sobre liberdade', note: 'Defende o indivíduo diante do Estado; pode contrastar com leituras centradas no coletivo.' },
  { id: 'politica-coletivo', when: ['liberal', 'liberdade'], query: 'socialism', title: 'Pensamento socialista', note: 'Parte do coletivo e da desigualdade; contrasta com leituras centradas no indivíduo.' },
  { id: 'sociologia-obras', when: ['sociologia'], query: 'anthropology', title: 'Antropologia', note: 'Olha a sociedade a partir de outras culturas.' },
  { id: 'religiao-ceticismo', when: ['religiao'], query: 'freethought', title: 'Livre pensamento', note: 'Questiona dogmas, como contraponto a leituras de fé.' },
  { id: 'ciencia-humanismo', when: ['ciencia'], query: 'humanism essays', title: 'Humanismo', note: 'Reflete sobre o que a ciência não responde sozinha.' },
  { id: 'historia-vencidos', when: ['historia', 'ficcao-historica'], query: 'slave narratives', title: 'Relatos de quem viveu a história', note: 'Voz de quem aparece pouco nas narrativas oficiais.' },
  { id: 'romance-outras-culturas', when: ['romance', 'drama', 'classico'], query: 'african fiction', title: 'Ficção africana', note: 'Mesmo gosto por narrativa, vista de outra tradição cultural.' },
  { id: 'fantasia-folclore', when: ['fantasia', 'ficcao-cientifica'], query: 'folklore', title: 'Folclore e mitos', note: 'A fonte dos mundos imaginários, em tradições de vários povos.' },
  { id: 'psicologia-sociedade', when: ['psicologia', 'desenvolvimento-pessoal'], query: 'sociology', title: 'Olhar social', note: 'Explica o comportamento pelo grupo, não só pelo indivíduo.' },
];

export const GOALS = [
  { id: 'aprender', label: 'Aprender algo', genres: ['ciencia', 'filosofia', 'historia'] },
  { id: 'relaxar', label: 'Relaxar', genres: ['aventura', 'misterio', 'contos'] },
  { id: 'pensar', label: 'Pensar sobre a vida', genres: ['filosofia', 'psicologia', 'religiao'] },
  { id: 'classico', label: 'Um clássico essencial', genres: ['classico', 'drama'] },
  { id: 'curto', label: 'Leitura curta', genres: ['contos', 'poesia', 'teatro'] },
  { id: 'portugues', label: 'Em português', genres: [], language: 'pt' },
];

export function goalContext(ctx, goalId) {
  const goal = GOALS.find((g) => g.id === goalId);
  if (!goal) return ctx;
  const genres = goal.genres.filter((g) => !ctx.signals.avoidGenres.includes(g));
  return {
    ...ctx,
    signals: {
      ...ctx.signals,
      genres,
      genreWeight: Object.fromEntries(genres.map((g) => [g, 1])),
      languages: goal.language ? [goal.language] : ctx.signals.languages,
      topics: [],
      likedAuthors: [],
      wantAuthors: [],
      boostAuthors: [],
      eras: [],
    },
    goalHasGenres: genres.length > 0,
  };
}

const EXCLUDE_FEEDBACK = new Set(['not_interested', 'read', 'added', 'known_author', 'dislike_kind', 'different']);

function topKeys(rows, limit) {
  return (rows || []).slice(0, limit).map((r) => r.key);
}

export function buildSignals({ taste, declared, feedback = {}, works = {} }) {
  const d = declared || {};
  const liked = new Set(d.genres || []);
  const likedWeight = {};
  (d.genres || []).forEach((g) => { likedWeight[g] = 1; });
  (taste?.genres?.liked || []).forEach((row) => {
    liked.add(row.key);
    likedWeight[row.key] = Math.max(likedWeight[row.key] || 0, Math.min(1, row.score / 4));
  });
  const avoid = new Set((taste?.genres?.disliked || []).map((r) => r.key));
  const likedAuthors = new Set([...(d.favoriteAuthors || []), ...topKeys(taste?.authors?.liked, 6)]);
  const boostGenres = new Set();
  const boostAuthors = new Set();
  const knownAuthors = new Set(d.favoriteAuthors || []);
  Object.entries(feedback).forEach(([workId, fb]) => {
    const snap = fb.work || works[workId] || {};
    if (fb.action === 'dislike_kind') (snap.genres || []).forEach((g) => avoid.add(g));
    if (fb.action === 'more_like') {
      (snap.genres || []).forEach((g) => { boostGenres.add(g); liked.add(g); likedWeight[g] = Math.max(likedWeight[g] || 0, 0.7); });
      (snap.authors || []).forEach((a) => boostAuthors.add(a));
    }
    if (fb.action === 'known_author') (snap.authors || []).forEach((a) => knownAuthors.add(a));
  });
  avoid.forEach((g) => liked.delete(g));
  const hasDeclared = Boolean(
    (d.genres || []).length || (d.favoriteAuthors || []).length || (d.favoriteBooks || []).length || (d.languages || []).length || (d.traits || []).length
  );
  const hasInferred = Boolean(taste && (taste.genres.liked.length || taste.authors.liked.length));
  const hasFeedback = Object.keys(feedback).length > 0;
  return {
    genres: [...liked],
    genreWeight: likedWeight,
    avoidGenres: [...avoid],
    avoidTopics: (d.avoidTopics || []).map(normalize).filter(Boolean),
    topics: d.topics || [],
    likedAuthors: [...likedAuthors],
    wantAuthors: d.wantAuthors || [],
    knownAuthors: [...knownAuthors],
    boostAuthors: [...boostAuthors],
    languages: [...new Set([...(d.languages || []), ...topKeys(taste?.languages?.liked, 2)])],
    eras: [...new Set([...(d.eras || []), ...topKeys(taste?.eras?.liked, 2)])],
    source: hasDeclared && hasInferred ? 'misto' : hasDeclared ? 'declarado' : hasInferred ? 'inferido' : hasFeedback ? 'feedback' : 'nenhum',
  };
}

export function seenFromBooks(books, taste, feedback = {}) {
  const genres = new Set();
  const languages = new Set();
  const authors = new Set();
  books.forEach((b) => {
    (b.catalog?.genres || []).forEach((g) => genres.add(g));
    if (b.catalog?.language) languages.add(b.catalog.language);
    String(b.subtitle || '').replace(/^Por\s+/i, '').split(/,\s*/).filter(Boolean).forEach((a) => authors.add(a));
  });
  (taste?.genres?.all || []).forEach((r) => genres.add(r.key));
  Object.values(feedback).forEach((fb) => {
    if (fb.action === 'different') (fb.work?.genres || []).forEach((g) => genres.add(g));
  });
  return { genres, languages, authors };
}

const lastName = (full) => normalize(String(full).split(/\s+/).slice(-1)[0] || '');
const sameAuthor = (a, b) => normalize(a) === normalize(b) || (lastName(a) && lastName(a) === lastName(b) && normalize(a)[0] === normalize(b)[0]);
const anyAuthor = (list, authors) => (authors || []).some((a) => (list || []).some((x) => sameAuthor(a, x)));

function eraOf(year) {
  if (!year) return null;
  if (year < 500) return 'antiguidade';
  if (year < 1500) return 'medieval';
  if (year < 1800) return 'moderna';
  if (year < 1900) return 'seculo-xix';
  if (year < 1950) return 'modernismo';
  return 'contemporanea';
}

export function workText(work) {
  return normalize([work.title, ...(work.subjects || [])].join(' '));
}

export function affinity(work, signals) {
  const reasons = [];
  let score = 0;
  const overlap = (work.genres || []).filter((g) => signals.genres.includes(g));
  if (overlap.length) {
    const weight = Math.max(...overlap.map((g) => signals.genreWeight[g] || 0.5));
    score += 45 * (0.5 + weight / 2);
    reasons.push(`gênero de que você gosta: ${overlap.map(genreLabel).join(', ')}`);
  }
  if (anyAuthor(signals.likedAuthors, work.authors) || anyAuthor(signals.boostAuthors, work.authors)) {
    score += 25;
    reasons.push('autor que você já valoriza');
  }
  if (anyAuthor(signals.wantAuthors, work.authors)) {
    score += 25;
    reasons.push('autor que você quer conhecer');
  }
  if (signals.languages.length && work.languages?.some((l) => signals.languages.includes(l))) {
    score += 15;
    reasons.push(`está em ${languageLabel(work.languages.find((l) => signals.languages.includes(l))).toLowerCase()}`);
  }
  if (signals.eras.length && signals.eras.includes(eraOf(work.firstYear))) {
    score += 10;
    reasons.push('da época que você prefere');
  }
  const text = workText(work);
  const topic = (signals.topics || []).find((t) => normalize(t) && text.includes(normalize(t)));
  if (topic) {
    score += 15;
    reasons.push(`trata de ${topic}`);
  }
  if (work.editions?.some((e) => isFree(e.best.access.level))) score += 5;
  const avoided = (work.genres || []).some((g) => signals.avoidGenres.includes(g));
  const blocked = signals.avoidTopics.some((t) => text.includes(t));
  if (avoided) score -= 50;
  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons, avoided, blocked };
}

export function novelty(work, seen, signals = { genres: [] }) {
  const reasons = [];
  const flags = { genre: false, language: false };
  let score = 0;
  const newGenres = (work.genres || []).filter((g) => !seen.genres.has(g) && !signals.genres.includes(g));
  if (newGenres.length) {
    flags.genre = true;
    score += 40;
    reasons.push(`gênero que você ainda não explorou: ${newGenres.map(genreLabel).join(', ')}`);
  }
  const newLang = (work.languages || []).filter((l) => seen.languages.size && !seen.languages.has(l));
  if (newLang.length) {
    flags.language = true;
    score += 20;
    reasons.push(`idioma novo para você: ${languageLabel(newLang[0]).toLowerCase()}`);
  }
  if (work.authors?.length && !work.authors.some((a) => seen.authors.has(a))) {
    score += 25;
    reasons.push('autor que não está na sua biblioteca');
  }
  if (work.firstYear && work.firstYear < 1900) {
    score += 10;
    reasons.push('obra de outra época');
  }
  return { score: Math.min(100, score), reasons, flags };
}

export function excluded(work, ctx) {
  const { ownedIds = new Set(), ownedTitles = new Set(), feedback = {} } = ctx;
  if (ownedIds.has(work.id) || ownedTitles.has(normalize(work.title))) return 'na-biblioteca';
  const fb = feedback[work.id];
  if (fb && EXCLUDE_FEEDBACK.has(fb.action)) return 'feedback';
  if (!work.title || !work.id) return 'incompleto';
  const sources = work.sources || [];
  if (sources.length === 1 && sources[0] === 'internetarchive') return 'fonte-sem-curadoria';
  if (!work.authors?.length) return 'sem-autor';
  return null;
}

function availabilityLine(work) {
  const best = work.best;
  const info = accessInfo(best.access.level);
  const where = best.access.inApp ? 'leitura no app' : 'abre na plataforma de origem';
  return `${info.label} (${where})`;
}

export function scoreWork(work, category, ctx) {
  const { signals, seen } = ctx;
  const a = affinity(work, signals);
  if (a.blocked) return null;
  const n = novelty(work, seen, signals);
  let score;
  let reasons;
  if (category === 'afinidade') {
    if (!a.reasons.length) return null;
    score = a.score;
    reasons = a.reasons;
  } else if (category === 'autores') {
    const knownHere = anyAuthor(signals.knownAuthors, work.authors) || anyAuthor(signals.likedAuthors, work.authors);
    if (knownHere || !work.authors?.length) return null;
    score = n.score * 0.6 + a.score * 0.4;
    reasons = [...(anyAuthor(signals.wantAuthors, work.authors) ? ['autor que você quer conhecer'] : []), ...n.reasons];
  } else {
    if (a.avoided) return null;
    if (category === 'horizontes' && ((work.genres || []).some((g) => signals.genres.includes(g)) || (!n.flags.genre && !n.flags.language))) return null;
    score = n.score * 0.7 + a.score * 0.3;
    reasons = n.reasons.length ? n.reasons : a.reasons;
    if (!reasons.length) return null;
  }
  return { score: Math.round(score), reasons, availability: availabilityLine(work), affinity: a.score, novelty: n.score };
}

export function diversify(scored, { limit = 6, perAuthor = 1, perGenre = 3 } = {}) {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const picked = [];
  const authorCount = new Map();
  const genreCount = new Map();
  for (const item of sorted) {
    if (picked.length >= limit) break;
    const authors = (item.work.authors || []).map(normalize);
    const genres = item.work.genres || [];
    if (authors.some((a) => (authorCount.get(a) || 0) >= perAuthor)) continue;
    if (genres.length && genres.every((g) => (genreCount.get(g) || 0) >= perGenre)) continue;
    picked.push(item);
    authors.forEach((a) => authorCount.set(a, (authorCount.get(a) || 0) + 1));
    genres.forEach((g) => genreCount.set(g, (genreCount.get(g) || 0) + 1));
  }
  return picked;
}

export function rankForCategory(works, category, ctx, options = {}) {
  const { shown = {} } = ctx;
  const seenIds = new Set();
  const scored = [];
  works.forEach((work) => {
    if (seenIds.has(work.id)) return;
    seenIds.add(work.id);
    if (excluded(work, ctx)) return;
    const s = scoreWork(work, category, ctx);
    if (!s || s.score < (options.minScore ?? 10)) return;
    const repeats = shown[work.id]?.count || 0;
    scored.push({ work, ...s, score: s.score - Math.min(30, repeats * 10) });
  });
  return diversify(scored, options);
}

function pickFrom(list, rng, n) {
  const pool = [...list];
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function buildRequests(category, ctx, rng = Math.random) {
  const { signals, seen } = ctx;
  const lang = signals.languages[0] || null;
  if (category === 'afinidade') {
    const genres = [...signals.genres].sort((a, b) => (signals.genreWeight[b] || 0) - (signals.genreWeight[a] || 0)).slice(0, 3);
    const requests = genres.map((g) => ({ genre: g, language: lang, page: 1 }));
    signals.likedAuthors.slice(0, 2).forEach((author) => requests.push({ author, page: 1 }));
    signals.wantAuthors.slice(0, 2).forEach((author) => requests.push({ author, page: 1 }));
    (signals.topics || []).slice(0, 2).forEach((query) => requests.push({ query, language: lang, page: 1 }));
    if (!requests.length && lang) requests.push({ query: 'romance', language: lang, page: 1 }, { query: 'contos', language: lang, page: 1 });
    return requests;
  }
  if (category === 'perspectiva') {
    const keys = new Set([...signals.genres, ...(signals.topics || []).map(normalize)]);
    const matches = PERSPECTIVES.filter((p) => p.when.some((w) => keys.has(w)));
    const chosen = matches.length ? pickFrom(matches, rng, 2) : pickFrom(PERSPECTIVES, rng, 2);
    return chosen.map((p) => ({ query: p.query, page: 1, perspective: p.id }));
  }
  const unseen = GENRES.filter((g) => !seen.genres.has(g.key) && !signals.avoidGenres.includes(g.key));
  const pool = unseen.length ? unseen : GENRES.filter((g) => !signals.avoidGenres.includes(g.key));
  const pageSeed = 1 + Math.floor(rng() * 2);
  return pickFrom(pool, rng, 3).map((g) => ({ genre: g.key, page: pageSeed }));
}

export function perspectiveFor(perspectiveId) {
  const found = PERSPECTIVES.find((p) => p.id === perspectiveId);
  return found ? { title: found.title, note: found.note, evidence: 'Evidência: obra publicada, sem verificação de mérito. Trate como um ponto de vista, não como consenso.' } : null;
}

export async function recommend({ catalog, category, ctx, rng = Math.random, limit = 6 }) {
  const requests = buildRequests(category, ctx, rng);
  const outcomes = await Promise.all(requests.map((r) => catalog.search(r).catch((error) => ({ works: [], failed: [{ source: 'catalogo', error: String(error?.message || error) }], allFailed: true }))));
  const origin = new Map();
  outcomes.forEach((o, i) => o.works.forEach((w) => { if (!origin.has(w.id)) origin.set(w.id, requests[i].perspective || null); }));
  const works = outcomes.flatMap((o) => o.works);
  const failed = outcomes.flatMap((o) => o.failed || []);
  const allFailed = outcomes.length > 0 && outcomes.every((o) => o.allFailed);
  const items = rankForCategory(works, category, ctx, { limit }).map((item) => ({
    ...item,
    perspective: category === 'perspectiva' ? perspectiveFor(origin.get(item.work.id)) : null,
  }));
  return { items, failed, allFailed, requests };
}
