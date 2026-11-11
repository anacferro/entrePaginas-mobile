import test from 'node:test';
import assert from 'node:assert/strict';
import { groupWorks } from '../src/services/catalog/dedupe.js';
import { ACCESS, classifyOpenLibrary, classifyInternetArchive, classifyGoogle, bestOffer } from '../src/services/catalog/availability.js';
import { titleKey, authorKey, isbnKey, normalize } from '../src/services/catalog/text.js';
import { fromOpenLibraryDoc, fromInternetArchiveDoc, parseGutenbergFeed } from '../src/services/catalog/sources.js';
import { createCatalog } from '../src/services/catalog/unifiedSearch.js';
import { genresOf } from '../src/services/catalog/genres.js';

const access = (level, inApp = false, formats = ['online']) => ({ level, confirmed: true, inApp, formats, note: '' });
let counter = 0;
const rec = (o) => ({ source: 's', sourceId: `id${counter++}`, title: 'T', authors: [], language: null, year: null, isbns: [], access: access(ACCESS.LIVRE), ...o });

test('normalizacao de titulo e autor', () => {
  assert.equal(titleKey('O Cortiço: romance brasileiro'), 'cortico');
  assert.equal(titleKey('Dom Casmurro (Portuguese)'), 'dom casmurro');
  assert.equal(titleKey('The Odyssey'), 'odyssey');
  assert.equal(authorKey(['Machado de Assis']), 'assis');
  assert.equal(normalize('Ação  Épica!'), 'acao epica');
});

test('isbn10 e isbn13 do mesmo livro coincidem', () => {
  assert.equal(isbnKey('0306406152'), '9780306406157');
  assert.equal(isbnKey('978-0-306-40615-7'), '9780306406157');
  assert.equal(isbnKey('123'), null);
});

test('duplicata clara vira uma obra com uma edicao e duas ofertas', () => {
  const works = groupWorks([
    rec({ source: 'openlibrary', title: 'Dom Casmurro', authors: ['Machado de Assis'], language: 'pt', year: 1899, access: access(ACCESS.LIVRE) }),
    rec({ source: 'gutenberg', title: 'Dom Casmurro', authors: ['Machado de Assis'], language: 'pt', year: 1899, access: access(ACCESS.DOMINIO_PUBLICO, true, ['epub']) }),
  ]);
  assert.equal(works.length, 1);
  assert.equal(works[0].editions.length, 1);
  assert.equal(works[0].editions[0].offers.length, 2);
  assert.equal(works[0].best.source, 'gutenberg');
});

test('traducoes e edicoes distintas nao sao fundidas', () => {
  const works = groupWorks([
    rec({ title: 'Dom Casmurro', authors: ['Machado de Assis'], language: 'pt', year: 1899 }),
    rec({ title: 'Dom Casmurro', authors: ['Machado de Assis'], language: 'en', year: 1953 }),
    rec({ title: 'Dom Casmurro', authors: ['Machado de Assis'], language: 'pt', year: 1971 }),
  ]);
  assert.equal(works.length, 1);
  assert.equal(works[0].editions.length, 3);
});

test('mesmo isbn funde edicoes mesmo com titulos diferentes', () => {
  const works = groupWorks([
    rec({ title: 'Memorias Postumas de Bras Cubas', authors: ['Machado de Assis'], isbns: ['9788535911664'], language: 'pt' }),
    rec({ title: 'Memorias Postumas de Bras Cubas: romance', authors: ['Machado de Assis'], isbns: ['8535911669'], language: 'pt' }),
  ]);
  assert.equal(works.length, 1);
  assert.equal(works[0].editions.length, 1);
});

test('autores diferentes com mesmo titulo ficam em obras separadas', () => {
  const works = groupWorks([
    rec({ title: 'Ensaio sobre a Cegueira', authors: ['Jose Saramago'] }),
    rec({ title: 'Ensaio sobre a Cegueira', authors: ['Outro Autor'] }),
  ]);
  assert.equal(works.length, 2);
});

test('classificacao conservadora do Open Library', () => {
  assert.equal(classifyOpenLibrary({ ebook_access: 'public', public_scan_b: true, ia: ['x'] }).level, ACCESS.LIVRE);
  assert.equal(classifyOpenLibrary({ ebook_access: 'public' }).level, ACCESS.NAO_CONFIRMADO);
  assert.equal(classifyOpenLibrary({ ebook_access: 'borrowable' }).level, ACCESS.EMPRESTIMO);
  assert.equal(classifyOpenLibrary({ ebook_access: 'printdisabled' }).level, ACCESS.RESTRITO);
  assert.equal(classifyOpenLibrary({ ebook_access: 'no_ebook' }).level, ACCESS.SEM_TEXTO);
});

test('Internet Archive: emprestimo, licenca e comunidade sem licenca', () => {
  assert.equal(classifyInternetArchive({ collection: ['inlibrary', 'printdisabled'], 'access-restricted-item': 'true' }).level, ACCESS.EMPRESTIMO);
  assert.equal(classifyInternetArchive({ collection: ['opensource'], licenseurl: 'https://creativecommons.org/licenses/by/4.0/' }).level, ACCESS.ACESSO_ABERTO);
  const marked = classifyInternetArchive({ collection: ['opensource'], licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/' });
  assert.equal(marked.level, ACCESS.LIVRE);
  assert.equal(marked.confirmed, false);
  const community = classifyInternetArchive({ collection: ['opensource'], format: ['EPUB', 'Text'] });
  assert.equal(community.level, ACCESS.NAO_CONFIRMADO);
  assert.equal(community.inApp, false);
});

test('Google Books: previa nunca vira gratuito', () => {
  assert.equal(classifyGoogle({ accessInfo: { viewability: 'PARTIAL' }, saleInfo: {} }).level, ACCESS.PREVIA);
  assert.equal(classifyGoogle({ accessInfo: { viewability: 'ALL_PAGES', publicDomain: true } }).level, ACCESS.DOMINIO_PUBLICO);
  assert.equal(classifyGoogle({ accessInfo: { viewability: 'NO_PAGES' } }).level, ACCESS.SEM_TEXTO);
  assert.equal(classifyGoogle({}).level, ACCESS.NAO_CONFIRMADO);
});

test('melhor oferta prefere gratuito, depois leitura no app', () => {
  const best = bestOffer([
    { source: 'a', access: access(ACCESS.EMPRESTIMO) },
    { source: 'b', access: access(ACCESS.LIVRE, false, ['online']) },
    { source: 'c', access: access(ACCESS.LIVRE, true, ['epub']) },
  ]);
  assert.equal(best.source, 'c');
});

test('adaptadores de fonte produzem registros coerentes', () => {
  const ol = fromOpenLibraryDoc({ key: '/works/OL1W', title: 'Dom Casmurro', author_name: ['Machado de Assis'], language: ['por', 'eng'], ebook_access: 'public', public_scan_b: true, ia: ['abc'], first_publish_year: 1899, subject: ['Brazilian fiction'] }, 'pt');
  assert.equal(ol.language, 'pt');
  assert.equal(ol.access.level, ACCESS.LIVRE);
  const ia = fromInternetArchiveDoc({ identifier: 'x1', title: 'Livro', creator: 'Assis, Machado de', language: ['por'], year: '1900', collection: ['opensource'] }, null);
  assert.equal(ia.language, 'pt');
  assert.deepEqual(ia.authors, ['Machado de Assis']);
  const feed = '<feed><entry><id>x</id><link href="/ebooks/55752.opds"/><title>Dom Casmurro (Portuguese)</title><content type="text">Machado de Assis</content></entry></feed>';
  assert.equal(parseGutenbergFeed(feed)[0].id, '55752');
});

test('busca unificada: uma fonte cai e as outras continuam', async () => {
  const ok = { id: 'openlibrary', search: async () => [rec({ source: 'openlibrary', title: 'Dom Casmurro', authors: ['Machado de Assis'], language: 'pt' })] };
  const down = { id: 'google', search: async () => { throw Object.assign(new Error('x'), { status: 503 }); } };
  const catalog = createCatalog({ sources: [ok, down] });
  const result = await catalog.search({ query: 'dom casmurro' });
  assert.equal(result.works.length, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].source, 'google');
  assert.equal(result.allFailed, false);
});

test('busca unificada: varios idiomas escolhidos consultam cada um e descartam os demais', async () => {
  const asked = [];
  const bank = { pt: 'Dom Casmurro', es: 'Cien anos de soledad', en: 'Moby Dick', fr: 'Les Miserables' };
  const src = { id: 'openlibrary', search: async ({ language }) => { asked.push(language); return [rec({ source: 'openlibrary', title: bank[language] || 'Sem idioma', authors: ['A'], language })]; } };
  const catalog = createCatalog({ sources: [src, { id: 'gutenberg', search: async () => [rec({ source: 'gutenberg', title: 'Moby Dick', authors: ['A'], language: 'en' })] }] });
  const result = await catalog.search({ query: 'livro', languages: ['pt', 'es'] });
  assert.deepEqual(asked.sort(), ['es', 'pt']);
  assert.deepEqual(result.works.map((w) => w.title).sort(), ['Cien anos de soledad', 'Dom Casmurro']);
  const all = await createCatalog({ sources: [src] }).search({ query: 'x' });
  assert.equal(all.works.length, 1);
});

test('busca unificada: todas caem, e o cache evita nova chamada', async () => {
  let calls = 0;
  const flaky = { id: 'openlibrary', search: async () => { calls += 1; return [rec({ source: 'openlibrary', title: 'Iracema', authors: ['Jose de Alencar'], language: 'pt' })]; } };
  const catalog = createCatalog({ sources: [flaky] });
  await catalog.search({ query: 'iracema' });
  await catalog.search({ query: 'iracema' });
  assert.equal(calls, 1);
  const dead = createCatalog({ sources: [{ id: 'google', search: async () => { throw new TypeError('net'); } }] });
  const r = await dead.search({ query: 'qualquer' });
  assert.equal(r.allFailed, true);
  assert.equal(r.works.length, 0);
});

test('filtros de idioma, ano e disponibilidade', async () => {
  const src = { id: 'openlibrary', search: async () => [
    rec({ source: 'openlibrary', title: 'Livro A', authors: ['A B'], language: 'pt', year: 1900, access: access(ACCESS.LIVRE) }),
    rec({ source: 'openlibrary', title: 'Livro B', authors: ['C D'], language: 'en', year: 2000, access: access(ACCESS.EMPRESTIMO) }),
  ] };
  const catalog = createCatalog({ sources: [src] });
  assert.equal((await catalog.search({ query: 'livro', language: 'pt' })).works.length, 1);
  assert.equal((await catalog.search({ query: 'livro', yearFrom: 1950 })).works.length, 1);
  assert.equal((await catalog.search({ query: 'livro', availability: 'free' })).works.length, 1);
  assert.equal((await catalog.search({ query: 'livro' })).works.length, 2);
});

test('generos por assunto', () => {
  assert.ok(genresOf(['Fantasy fiction', 'Dragons']).includes('fantasia'));
  assert.ok(genresOf(['Poesia brasileira']).includes('poesia'));
  assert.deepEqual(genresOf([], 'Sem pista alguma'), []);
  assert.ok(!genresOf([], 'Memorias Postumas de Bras Cubas').includes('biografia'));
});
