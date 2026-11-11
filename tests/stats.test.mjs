import test from 'node:test';
import assert from 'node:assert/strict';
import { indicators, streaks, booksOverTime, pagesPerMonth, calendar, distributions, narrative, rangeFor, isValidDay, buckets, statusFor } from '../src/services/stats/insights.js';
import { bookWorkId } from '../src/services/catalog/identity.js';

const NOW = new Date(2026, 4, 20, 12);

const book = (id, title, author, extra = {}) => ({ id, title, subtitle: `Por ${author}`, category: 'Literatura', totalPages: 200, ...extra });
const A = book('a', 'Livro A', 'Ana Silva', { totalPages: 100, catalog: { genres: ['fantasia'], language: 'pt', year: 1895, source: 'gutenberg' } });
const B = book('b', 'Livro B', 'Ana Silva', { totalPages: 300, catalog: { genres: ['fantasia'], language: 'en', year: 1990 } });
const C = book('c', 'Livro C', 'Caio Souza', { totalPages: 200, isOwn: true });
const D = book('d', 'Livro D', 'Dani Reis', { totalPages: 1 });
const books = [A, B, C, D];

const log = {
  books: {
    a: { finishedAt: '2026-05-10T10:00:00', credited: 100, seconds: 3600 },
    b: { finishedAt: '2026-04-15T10:00:00', credited: 300, seconds: 7200 },
    c: { startedAt: '2026-05-01T10:00:00', credited: 50, seconds: 0 },
    d: { abandonedAt: '2026-03-01T10:00:00', credited: 10, seconds: 0 },
  },
  days: {
    '2026-05-08': { a: { pages: 40, seconds: 1000 } },
    '2026-05-09': { a: { pages: 30, seconds: 1000 }, c: { pages: 10, seconds: 0 } },
    '2026-05-10': { a: { pages: 30, seconds: 1600 } },
    '2026-05-12': { c: { pages: 40, seconds: 0 } },
    '2026-04-14': { b: { pages: 100, seconds: 3000 } },
    '2026-04-15': { b: { pages: 200, seconds: 4200 } },
  },
  goal: { year: 2026, target: 4 },
};

test('status segue a regra de finalizado, abandonado, lendo e planejado', () => {
  assert.equal(statusFor(A, {}, log.books.a), 'lido');
  assert.equal(statusFor(D, {}, log.books.d), 'abandonado');
  assert.equal(statusFor(C, {}, log.books.c), 'lendo');
  assert.equal(statusFor(book('z', 'Z', 'Z'), {}, undefined), 'planejado');
});

test('indicadores batem com os dados conhecidos', () => {
  const ratingsA = { [bookWorkId(A)]: { stars: 5, aspects: {} }, [bookWorkId(B)]: { stars: 3, aspects: {} } };
  const ind = indicators({ books, positions: {}, log, personal: { ratings: ratingsA }, now: NOW });
  assert.equal(ind.finished, 2);
  assert.equal(ind.inProgress, 1);
  assert.equal(ind.abandoned, 1);
  assert.equal(ind.added, 4);
  assert.equal(ind.pagesRead, 460);
  assert.equal(ind.avgPagesFinished, 200);
  assert.equal(ind.avgRating, 4);
  assert.equal(ind.hours, 3);
  assert.deepEqual(ind.goal, { year: 2026, target: 4, done: 2, percent: 50 });
});

test('horas so aparecem com tempo medido suficiente e sem nota media sem avaliacoes', () => {
  const ind = indicators({ books: [A], positions: {}, log: { books: { a: { seconds: 120 } }, days: {} }, personal: { ratings: {} }, now: NOW });
  assert.equal(ind.hours, null);
  assert.equal(ind.avgRating, null);
});

test('sequencia mais longa e atual', () => {
  const ids = new Set(['a', 'b', 'c']);
  const s = streaks(log, ids, new Date(2026, 4, 11, 9));
  assert.equal(s.longest, 3);
  assert.equal(s.readingDays, 6);
  assert.equal(s.current, 3);
  assert.equal(streaks(log, ids, new Date(2026, 4, 20)).current, 0);
});

test('livros concluidos por mes e por ano', () => {
  const month = booksOverTime({ books, log, range: rangeFor('month', NOW) });
  assert.equal(month.length, 12);
  assert.equal(month.find((m) => m.key === '2026-05').value, 1);
  assert.equal(month.find((m) => m.key === '2026-04').value, 1);
  assert.equal(month.reduce((s, m) => s + m.value, 0), 2);
  const year = booksOverTime({ books, log, range: rangeFor('year', NOW) });
  assert.equal(year[year.length - 1].value, 2);
});

test('periodo personalizado valida datas e escolhe a granularidade', () => {
  assert.equal(isValidDay('2026-02-30'), false);
  assert.equal(rangeFor('custom', NOW, { from: '2026-05-10', to: '2026-05-01' }), null);
  const r = rangeFor('custom', NOW, { from: '2026-05-01', to: '2026-05-14' });
  assert.equal(r.granularity, 'day');
  assert.equal(booksOverTime({ books, log, range: r }).find((d) => d.key === '2026-05-10').value, 1);
  assert.equal(buckets('week', new Date(2026, 4, 20), new Date(2026, 4, 20))[0].key, '2026-05-18');
});

test('paginas por mes somam exatamente o diario', () => {
  const months = pagesPerMonth({ books, log, now: NOW });
  assert.equal(months.find((m) => m.key === '2026-05').value, 150);
  assert.equal(months.find((m) => m.key === '2026-04').value, 300);
});

test('livro apagado nao conta nas paginas', () => {
  const months = pagesPerMonth({ books: [A], log, now: NOW });
  assert.equal(months.find((m) => m.key === '2026-05').value, 100);
});

test('calendario marca dias lidos sem inventar atividade', () => {
  const cal = calendar({ books, log, now: NOW });
  assert.equal(cal.columns.length, 26);
  assert.equal(cal.activeDays, 6);
  const day = cal.columns.flat().find((c) => c.key === '2026-05-08');
  assert.equal(day.pages, 40);
  assert.equal(day.level, 1);
  assert.equal(cal.columns.flat().find((c) => c.key === '2026-04-15').level, 4);
  assert.equal(cal.max, 200);
  assert.equal(cal.columns.flat().find((c) => c.key === '2026-05-21').future, true);
  assert.equal(cal.columns.flat().find((c) => c.key === '2026-05-11').level, 0);
});

test('distribuicoes contam so lidos e informam o que falta', () => {
  const d = distributions({ books, positions: {}, log, personal: { ratings: {} }, scope: 'lidos' });
  assert.equal(d.total, 2);
  assert.deepEqual(d.genre.map((g) => [g.key, g.count]), [['fantasia', 2]]);
  assert.equal(d.author[0].label, 'Ana Silva');
  assert.equal(d.author[0].count, 2);
  assert.deepEqual(d.decade.map((x) => x.label), ['1890s', '1990s']);
  assert.equal(d.countryAvailable, false);
  const all = distributions({ books, positions: {}, log, personal: { ratings: {} }, scope: 'todos' });
  assert.equal(all.total, 4);
  assert.ok(all.type.some((t) => t.label === 'Obra própria'));
  assert.ok(all.missing.language >= 2);
});

test('relatorio usa so dados reais e avisa sobre amostra pequena', () => {
  const r = narrative({ books, positions: {}, log, personal: { ratings: {} }, now: NOW });
  assert.ok(r.lines[0].includes('Em maio você leu 150 páginas e concluiu 1 livro. Em abril foram 300 páginas e 1 livro.'));
  assert.ok(r.lines.some((l) => l.includes('Fantasia')));
  assert.ok(r.caveats.some((c) => c.includes('poucos livros')));
  assert.equal(r.caveats.some((c) => c.includes('contagem de páginas')), false);
});

test('sem dados nao ha relatorio inventado', () => {
  const r = narrative({ books: [], positions: {}, log: { books: {}, days: {} }, personal: { ratings: {} }, now: NOW });
  assert.equal(r.lines.length, 0);
  const only = narrative({ books: [book('x', 'X', 'Y')], positions: {}, log: { books: {}, days: {} }, personal: { ratings: {} }, now: NOW });
  assert.equal(only.lines.length, 0);
});

test('nota ligada a caracteristicas so com tres avaliacoes', () => {
  const ratings = {};
  [A, B, C].forEach((b) => { ratings[bookWorkId(b)] = { stars: 5, aspects: { characters: true } }; });
  const r = narrative({ books, positions: {}, log, personal: { ratings }, now: NOW });
  assert.ok(r.lines.some((l) => l.includes('personagens')));
  const few = narrative({ books, positions: {}, log, personal: { ratings: { [bookWorkId(A)]: { stars: 5, aspects: { characters: true } } } }, now: NOW });
  assert.ok(few.caveats.some((c) => c.includes('menos de 3 avaliações')));
});
