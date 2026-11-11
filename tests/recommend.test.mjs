import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSignals, seenFromBooks, rankForCategory, affinity, buildRequests, recommend, diversify } from '../src/services/recommend/engine.js';
import { validateReasons, validateChat, minimizeProfile, candidatesForPrompt } from '../src/services/recommend/curator.js';
import { emptyDeclared } from '../src/services/personal.js';

const work = (id, title, authors, genres, extra = {}) => ({
  id,
  title,
  authors,
  genres,
  subjects: extra.subjects || [],
  languages: extra.languages || ['pt'],
  firstYear: extra.year || 1900,
  editions: [{ best: { access: { level: extra.level || 'dominio_publico', inApp: false } } }],
  best: { access: { level: extra.level || 'dominio_publico', inApp: false } },
});

const emptyTaste = { genres: { liked: [], disliked: [], all: [] }, authors: { liked: [] }, languages: { liked: [] }, eras: { liked: [] }, traits: { liked: [] }, counts: { finished: 0 }, confidence: 'baixa' };
const ctxFor = (declared = emptyDeclared(), taste = emptyTaste, extra = {}) => {
  const signals = buildSignals({ taste, declared, feedback: extra.feedback || {} });
  return { signals, seen: seenFromBooks(extra.books || [], taste), ownedIds: extra.ownedIds || new Set(), ownedTitles: extra.ownedTitles || new Set(), feedback: extra.feedback || {}, shown: extra.shown || {} };
};

test('sem perfil nem historico nao ha afinidade inventada', () => {
  const ctx = ctxFor();
  assert.equal(ctx.signals.source, 'nenhum');
  const items = rankForCategory([work('w:a:b', 'A', ['B C'], ['fantasia'])], 'afinidade', ctx);
  assert.equal(items.length, 0);
});

test('afinidade vem de genero declarado e explica o motivo', () => {
  const declared = { ...emptyDeclared(), genres: ['fantasia'] };
  const ctx = ctxFor(declared);
  const items = rankForCategory([work('w:a:b', 'Magia', ['Ana Lima'], ['fantasia']), work('w:c:d', 'Contas', ['Beto Souza'], ['ciencia'])], 'afinidade', ctx);
  assert.equal(items.length, 1);
  assert.equal(items[0].work.id, 'w:a:b');
  assert.match(items[0].reasons[0], /Fantasia/);
});

test('livro ja na biblioteca ou recusado nunca e recomendado', () => {
  const declared = { ...emptyDeclared(), genres: ['fantasia'] };
  const works = [work('w:1:a', 'Um', ['A Um'], ['fantasia']), work('w:2:b', 'Dois', ['B Dois'], ['fantasia']), work('w:3:c', 'Tres', ['C Tres'], ['fantasia'])];
  const ctx = ctxFor(declared, emptyTaste, { ownedIds: new Set(['w:1:a']), feedback: { 'w:2:b': { action: 'not_interested' } } });
  const ids = rankForCategory(works, 'afinidade', ctx, { perAuthor: 5 }).map((i) => i.work.id);
  assert.deepEqual(ids, ['w:3:c']);
});

test('genero evitado e tema evitado excluem o livro', () => {
  const declared = { ...emptyDeclared(), genres: ['fantasia'], avoidTopics: ['vampiros'] };
  const taste = { ...emptyTaste, genres: { liked: [], disliked: [{ key: 'terror', score: -3 }], all: [] } };
  const ctx = ctxFor(declared, taste);
  const works = [work('w:1:a', 'Noite de vampiros', ['A Um'], ['fantasia']), work('w:2:b', 'Casa maldita', ['B Dois'], ['terror', 'fantasia'])];
  const ids = rankForCategory(works, 'afinidade', ctx).map((i) => i.work.id);
  assert.equal(ctx.signals.avoidGenres.includes('terror'), true);
  assert.equal(ids.includes('w:1:a'), false);
  assert.equal(rankForCategory([works[1]], 'horizontes', ctx).length, 0);
});

test('dislike_kind passa a evitar o genero e more_like reforca', () => {
  const fb = { 'w:x:y': { action: 'dislike_kind', work: { genres: ['romance'], authors: ['X Y'] } }, 'w:p:q': { action: 'more_like', work: { genres: ['poesia'], authors: ['P Q'] } } };
  const s = buildSignals({ taste: emptyTaste, declared: emptyDeclared(), feedback: fb });
  assert.ok(s.avoidGenres.includes('romance'));
  assert.ok(s.genres.includes('poesia'));
  assert.ok(s.boostAuthors.includes('P Q'));
  assert.equal(s.source, 'feedback');
});

test('horizontes priorizam o que o leitor ainda nao explorou', () => {
  const declared = { ...emptyDeclared(), genres: ['romance'] };
  const books = [{ catalog: { genres: ['romance'], language: 'pt' }, subtitle: 'Por Ana Lima' }];
  const ctx = ctxFor(declared, emptyTaste, { books });
  const items = rankForCategory([work('w:1:a', 'Romance novo', ['Ana Lima'], ['romance']), work('w:2:b', 'Poemas', ['Bia Souza'], ['poesia'], { year: 1850 })], 'horizontes', ctx, { perAuthor: 5 });
  assert.equal(items[0].work.id, 'w:2:b');
});

test('autores para conhecer excluem autor que ja e favorito', () => {
  const declared = { ...emptyDeclared(), favoriteAuthors: ['Machado de Assis'] };
  const ctx = ctxFor(declared);
  const items = rankForCategory([work('w:1:a', 'Livro', ['Machado de Assis'], ['classico']), work('w:2:b', 'Outro', ['Clarice Lispector'], ['classico'])], 'autores', ctx);
  assert.deepEqual(items.map((i) => i.work.id), ['w:2:b']);
});

test('diversidade limita um autor por lista e livros repetidos perdem prioridade', () => {
  const s = [1, 2, 3].map((n) => ({ work: work(`w:${n}:a`, `T${n}`, ['Mesmo Autor'], ['fantasia']), score: 80 - n }));
  assert.equal(diversify(s, { limit: 5 }).length, 1);
  const declared = { ...emptyDeclared(), genres: ['fantasia'] };
  const a = work('w:a:x', 'A', ['A X'], ['fantasia']);
  const b = work('w:b:y', 'B', ['B Y'], ['fantasia']);
  const ctx = ctxFor(declared, emptyTaste, { shown: { 'w:a:x': { count: 3 } } });
  const items = rankForCategory([a, b], 'afinidade', ctx);
  assert.equal(items[0].work.id, 'w:b:y');
});

test('perspectiva usa tabela de contraste e rotula a evidencia', async () => {
  const declared = { ...emptyDeclared(), genres: ['filosofia'] };
  const ctx = ctxFor(declared);
  const reqs = buildRequests('perspectiva', ctx, () => 0);
  assert.equal(reqs[0].perspective, 'filosofia-empirismo');
  const catalog = { search: async () => ({ works: [work('w:e:h', 'Ensaio', ['D Hume'], ['filosofia'], { subjects: ['empiricism'] })], failed: [], allFailed: false }) };
  const out = await recommend({ catalog, category: 'perspectiva', ctx: { ...ctx, signals: { ...ctx.signals, genres: ['romance'], avoidGenres: [] } }, rng: () => 0 });
  assert.ok(out.items.length === 0 || out.items[0].perspective.evidence.includes('Evidência'));
});

test('falha total do catalogo e reportada sem inventar livros', async () => {
  const catalog = { search: async () => { throw new Error('rede'); } };
  const ctx = ctxFor({ ...emptyDeclared(), genres: ['fantasia'] });
  const out = await recommend({ catalog, category: 'afinidade', ctx });
  assert.equal(out.items.length, 0);
  assert.equal(out.allFailed, true);
});

test('curadora descarta obra fora da lista e promessa de gratuidade sem confirmacao', () => {
  const ctx = ctxFor({ ...emptyDeclared(), genres: ['fantasia'] });
  const paid = work('w:p:a', 'Pago', ['A P'], ['fantasia'], { level: 'previa' });
  const open = work('w:o:b', 'Aberto', ['B O'], ['fantasia']);
  const items = [{ work: paid }, { work: open }];
  const raw = JSON.stringify({ itens: [{ id: 'w:p:a', motivo: 'Gratuito e ótimo.' }, { id: 'w:o:b', motivo: 'Combina com fantasia.' }, { id: 'w:inventado', motivo: 'x' }] });
  const { reasons, discarded } = validateReasons(raw, items);
  assert.equal(reasons.has('w:p:a'), false);
  assert.equal(reasons.get('w:o:b'), 'Combina com fantasia.');
  assert.equal(discarded.length, 2);
  assert.ok(ctx);
});

test('chat so mostra indicados verificados', () => {
  const open = work('w:o:b', 'Aberto', ['B O'], ['fantasia']);
  const raw = JSON.stringify({ resposta: 'Veja estes.', indicados: [{ id: 'w:o:b', motivo: 'bom' }, { id: 'w:fake:x', motivo: 'falso' }], perguntas: ['Qual época?'] });
  const out = validateChat(raw, [{ work: open }]);
  assert.equal(out.picks.length, 1);
  assert.deepEqual(out.discarded, ['w:fake:x']);
  assert.equal(validateChat('lixo', [{ work: open }]), null);
});

test('perfil enviado a IA e minimo e nao carrega texto livre de resenhas', () => {
  const declared = { ...emptyDeclared(), genres: ['fantasia'], notes: 'segredo pessoal', favoriteBooks: ['Livro Secreto'] };
  const ctx = ctxFor(declared);
  const profile = minimizeProfile({ signals: ctx.signals, declared, taste: emptyTaste });
  const text = JSON.stringify(profile);
  assert.equal(text.includes('segredo pessoal'), false);
  assert.equal(text.includes('Livro Secreto'), false);
  const cands = candidatesForPrompt([{ work: work('w:o:b', 'Aberto', ['B O'], ['fantasia']) }]);
  assert.equal(cands[0].disponibilidade, 'Domínio público');
});

test('affinity sobe com autor querido e idioma preferido', () => {
  const ctx = ctxFor({ ...emptyDeclared(), languages: ['pt'], wantAuthors: ['Clarice Lispector'] });
  const a = affinity(work('w:1:a', 'T', ['Clarice Lispector'], []), ctx.signals);
  assert.ok(a.score >= 40);
});

test('objetivo troca os generos de busca e respeita o que o leitor evita', async () => {
  const { goalContext } = await import('../src/services/recommend/engine.js');
  const taste = { ...emptyTaste, genres: { liked: [{ key: 'romance', score: 5 }], disliked: [{ key: 'filosofia', score: -3 }], all: [] } };
  const ctx = goalContext(ctxFor(emptyDeclared(), taste), 'aprender');
  assert.deepEqual(ctx.signals.genres.sort(), ['ciencia', 'historia']);
  const reqs = buildRequests('afinidade', ctx, () => 0);
  assert.ok(reqs.every((r) => ['ciencia', 'historia'].includes(r.genre)));
  const pt = goalContext(ctxFor(), 'portugues');
  assert.deepEqual(pt.signals.languages, ['pt']);
});

test('horizontes nao repetem genero que o leitor declarou gostar', () => {
  const ctx = ctxFor({ ...emptyDeclared(), genres: ['fantasia'] });
  const items = rankForCategory([work('w:1:a', 'Magia', ['Ana Lima'], ['fantasia']), work('w:2:b', 'Versos', ['Bia Souza'], ['poesia'])], 'horizontes', ctx, { perAuthor: 5 });
  assert.deepEqual(items.map((i) => i.work.id), ['w:2:b']);
});

test('obra so do Internet Archive ou sem autor nao entra nas recomendacoes', () => {
  const ctx = ctxFor({ ...emptyDeclared(), genres: ['fantasia'] });
  const ia = { ...work('w:1:a', 'Fanfic', ['Anon X'], ['fantasia']), sources: ['internetarchive'] };
  const ok = { ...work('w:2:b', 'Phantastes', ['George MacDonald'], ['fantasia']), sources: ['openlibrary'] };
  const noAuthor = work('w:3:c', 'Sem autor', [], ['fantasia']);
  assert.deepEqual(rankForCategory([ia, ok, noAuthor], 'afinidade', ctx, { perAuthor: 5 }).map((i) => i.work.id), ['w:2:b']);
});
