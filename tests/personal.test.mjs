import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPersonal, normalizePersonal, setRating, setRatingDetails, removeRating, setDeclared, inferTaste, profileCompleteness } from '../src/services/personal.js';
import { bookWorkId, workIdFor } from '../src/services/catalog/identity.js';

const statusOf = (book, position, entry) => (entry?.finishedAt ? 'lido' : entry?.abandonedAt ? 'abandonado' : entry || position > 1 ? 'lendo' : 'planejado');

const book = (id, title, author, extra = {}) => ({ id, title, subtitle: `Por ${author}`, category: 'Literatura', totalPages: 300, ...extra });
const finished = { finishedAt: '2026-01-01', credited: 300 };

test('identidade da obra e a mesma para livro da estante e do catalogo', () => {
  assert.equal(workIdFor('Dom Casmurro', ['Machado de Assis']), 'w:dom-casmurro:assis');
  assert.equal(bookWorkId(book('1', 'Dom Casmurro', 'Machado de Assis')), 'w:dom-casmurro:assis');
  assert.equal(bookWorkId({ title: 'x', catalog: { workId: 'w:abc:z' } }), 'w:abc:z');
});

test('nota fica ligada a obra, pode ser editada e removida', () => {
  const p = emptyPersonal();
  setRating(p, { workId: 'w:a:b', title: 'A', stars: 4 });
  assert.equal(p.ratings['w:a:b'].stars, 4);
  setRatingDetails(p, 'w:a:b', { aspects: { characters: true, plot: false }, review: 'bom' });
  setRating(p, { workId: 'w:a:b', stars: 5 });
  assert.equal(p.ratings['w:a:b'].stars, 5);
  assert.equal(p.ratings['w:a:b'].aspects.characters, true);
  assert.equal(p.ratings['w:a:b'].review, 'bom');
  removeRating(p, 'w:a:b');
  assert.equal(Object.keys(p.ratings).length, 0);
});

test('nota fora do intervalo e normalizada', () => {
  const p = emptyPersonal();
  setRating(p, { workId: 'w:x:y', title: 'X', stars: 9 });
  assert.equal(p.ratings['w:x:y'].stars, 5);
  setRating(p, { workId: 'w:x:y', stars: 0 });
  assert.equal(p.ratings['w:x:y'].stars, 1);
});

test('normalizacao descarta lixo e preserva o valido', () => {
  const p = normalizePersonal({ declared: { genres: ['fantasia', 5, ''], length: 'enorme', period: 'ambos' }, settings: { useReviews: false } });
  assert.deepEqual(p.declared.genres, ['fantasia', '5']);
  assert.equal(p.declared.length, null);
  assert.equal(p.declared.period, 'ambos');
  assert.equal(p.settings.useReviews, false);
  assert.equal(p.settings.useRatings, true);
});

test('adicionar livro nao conta como gostar', () => {
  const p = emptyPersonal();
  const books = [book('1', 'Livro Fantasia', 'Autor A', { catalog: { genres: ['fantasia'] } })];
  const t = inferTaste({ books, statusOf, log: { books: {} }, positions: {}, personal: p });
  assert.equal(t.genres.liked.length, 0);
  assert.equal(t.counts.added, 1);
  assert.equal(t.confidence, 'baixa');
});

test('lido com nota alta pesa a favor e nota baixa pesa contra', () => {
  const p = emptyPersonal();
  const a = book('1', 'Bom Livro', 'Ana Silva', { catalog: { genres: ['filosofia'], language: 'pt', year: 1890 } });
  const b = book('2', 'Livro Ruim', 'Beto Souza', { catalog: { genres: ['romance'], language: 'en' } });
  setRating(p, { workId: bookWorkId(a), title: a.title, stars: 5 });
  setRating(p, { workId: bookWorkId(b), title: b.title, stars: 1 });
  const t = inferTaste({ books: [a, b], statusOf, log: { books: { 1: finished, 2: finished } }, positions: {}, personal: p });
  assert.equal(t.genres.liked[0].key, 'filosofia');
  assert.equal(t.genres.disliked[0].key, 'romance');
  assert.equal(t.authors.liked[0].key, 'Ana Silva');
  assert.equal(t.languages.liked[0].key, 'pt');
  assert.equal(t.eras.liked[0].key, 'seculo-xix');
});

test('abandonado pesa pouco contra, sem virar rejeicao forte', () => {
  const p = emptyPersonal();
  const a = book('1', 'Largado', 'Carla', { catalog: { genres: ['terror'] } });
  const t = inferTaste({ books: [a], statusOf, log: { books: { 1: { abandonedAt: '2026-02-01', credited: 40 } } }, positions: {}, personal: p });
  assert.equal(t.counts.abandoned, 1);
  assert.equal(t.genres.all[0].score, -0.8);
});

test('aspectos da avaliacao viram tracos e respeitam a configuracao de privacidade', () => {
  const p = emptyPersonal();
  const a = book('1', 'Livro', 'Dani', { catalog: { genres: ['fantasia'] } });
  setRating(p, { workId: bookWorkId(a), title: a.title, stars: 5 });
  setRatingDetails(p, bookWorkId(a), { aspects: { characters: true, surprise: 'surpreendente' } });
  const log = { books: { 1: finished } };
  const on = inferTaste({ books: [a], statusOf, log, positions: {}, personal: p });
  assert.ok(on.traits.liked.some((t) => t.key === 'personagens-complexos'));
  assert.ok(on.traits.liked.some((t) => t.key === 'reviravoltas'));
  p.settings.useReviews = false;
  const off = inferTaste({ books: [a], statusOf, log, positions: {}, personal: p });
  assert.equal(off.traits.liked.length, 0);
  p.settings.useRatings = false;
  const noRatings = inferTaste({ books: [a], statusOf, log, positions: {}, personal: p });
  assert.equal(noRatings.genres.liked.length, 1);
  assert.equal(noRatings.genres.liked[0].score, 0.6);
  p.settings.useHistory = false;
  const noHistory = inferTaste({ books: [a], statusOf, log, positions: {}, personal: p });
  assert.equal(noHistory.genres.liked.length, 0);
});

test('perfil declarado e completude', () => {
  const p = emptyPersonal();
  assert.equal(profileCompleteness(p.declared).done, 0);
  setDeclared(p, { genres: ['fantasia'], languages: ['pt'], period: 'classico' });
  assert.deepEqual(profileCompleteness(p.declared), { done: 3, total: 6 });
});
