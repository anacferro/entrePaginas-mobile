import test from 'node:test';
import assert from 'node:assert/strict';
import { deflate } from 'pako';
import { writeZip, readZip, crc32 } from '../src/services/converter/zip.js';
import { inspect, convert, toImported, advise, verify } from '../src/services/converter/index.js';
import { chaptersOf, alnum, docText } from '../src/services/converter/model.js';
import { recommend, applyAdvice } from '../src/services/converter/analyze.js';
import { parseEpub } from '../src/services/epubParser.js';
import { parsePdf } from '../src/services/pdfParser.js';
import { jpegInfo } from '../src/services/converter/writers/pdfImages.js';

const enc = (s) => new TextEncoder().encode(s);

function png(width, height, color = 6) {
  const channels = color === 6 ? 4 : color === 2 ? 3 : color === 4 ? 2 : 1;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = [0];
    for (let x = 0; x < width; x += 1) for (let c = 0; c < channels; c += 1) row.push((x * 40 + y * 20 + c * 30) & 255);
    rows.push(...row);
  }
  const idat = deflate(Uint8Array.from(rows));
  const chunk = (type, data) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(enc(type), 4);
    out.set(data, 8);
    const crcInput = new Uint8Array(4 + data.length);
    crcInput.set(enc(type), 0);
    crcInput.set(data, 4);
    view.setUint32(8 + data.length, crc32(crcInput));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = color;
  const parts = [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  parts.forEach((p) => { out.set(p, at); at += p.length; });
  return out;
}

const JPEG = Uint8Array.from(Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));

const W = (t) => `<w:t xml:space="preserve">${t}</w:t>`;
const para = (text, style, extra = '') => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr><w:r>${W(text)}</w:r></w:p>`;

function docx({ chapters = 4, images = false, tables = 0, toc = false, footnotes = false, words = 400, macros = false } = {}) {
  const body = [];
  if (toc) body.push(para('Sumário', 'TOC1'), para('Capítulo 1', 'TOC1'));
  body.push(para('Dom Casmurro de Teste', 'Title'));
  const filler = 'Capitu olhou para o mar e, depois de muito pensar, resolveu contar tudo à família. ';
  for (let c = 1; c <= chapters; c += 1) {
    body.push(para(`Capítulo ${c} — Ação e emoção`, 'Heading1'));
    body.push(`<w:p><w:r><w:rPr><w:b/></w:rPr>${W('Negrito inicial.')}</w:r><w:r><w:rPr><w:i/></w:rPr>${W(' Itálico no meio.')}</w:r><w:r>${W(' ')}${W(filler.repeat(Math.ceil(words / 15)))}${footnotes && c === 1 ? '<w:footnoteReference w:id="2"/>' : ''}</w:r></w:p>`);
    body.push(para('Subtítulo da seção', 'Heading2'));
    body.push(para(filler.repeat(Math.ceil(words / 15))));
    body.push(para('Primeiro item da lista', 'ListParagraph', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'));
    body.push(para('Segundo item da lista', 'ListParagraph', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'));
    body.push(para('“A vida é breve”, disse ela.', 'Quote'));
  }
  for (let t = 0; t < tables; t += 1) {
    body.push(`<w:tbl><w:tr><w:tc>${para('Ano')}</w:tc><w:tc>${para('Livro')}</w:tc></w:tr><w:tr><w:tc>${para('1899')}</w:tc><w:tc>${para('Dom Casmurro')}</w:tc></w:tr></w:tbl>`);
  }
  if (images) body.push('<w:p><w:r><w:drawing><wp:inline><wp:docPr id="1" name="Figura" descr="Capa do livro"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rId5"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>');
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>' },
    { name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="w"><w:body>${body.join('')}<w:sectPr/></w:body></w:document>` },
    { name: 'word/styles.xml', data: '<w:styles><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/></w:style><w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/></w:style></w:styles>' },
    { name: 'word/numbering.xml', data: '<w:numbering><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>' },
    { name: 'docProps/core.xml', data: '<cp:coreProperties><dc:title>Dom Casmurro de Teste</dc:title><dc:creator>Machado de Assis</dc:creator></cp:coreProperties>' },
    { name: 'docProps/app.xml', data: '<Properties><Pages>185</Pages></Properties>' },
  ];
  if (footnotes) files.push({ name: 'word/footnotes.xml', data: '<w:footnotes><w:footnote w:type="separator" w:id="0"><w:p/></w:footnote><w:footnote w:id="2"><w:p><w:r>' + W('Nota de rodapé sobre Capitu.') + '</w:r></w:p></w:footnote></w:footnotes>' });
  if (images) {
    files.push({ name: 'word/_rels/document.xml.rels', data: '<Relationships><Relationship Id="rId5" Type="image" Target="media/image1.png"/></Relationships>' });
    files.push({ name: 'word/media/image1.png', data: png(8, 8) });
  }
  if (macros) files.push({ name: 'word/vbaProject.bin', data: Uint8Array.from([1, 2, 3, 4]) });
  return { name: 'Meu livro.docx', bytes: writeZip(files) };
}

test('zip: gravar e ler de volta, com mimetype sem compressao primeiro', () => {
  const bytes = writeZip([{ name: 'mimetype', data: 'application/epub+zip', store: true }, { name: 'a/b.txt', data: 'olá mundo '.repeat(50) }]);
  assert.equal(new TextDecoder().decode(bytes.subarray(30, 38)), 'mimetype');
  const zip = readZip(bytes);
  assert.equal(zip.text('mimetype'), 'application/epub+zip');
  assert.equal(zip.text('a/b.txt'), 'olá mundo '.repeat(50));
});

test('seguranca: senha, arquivo truncado, DOC antigo, binario e extensao enganosa', () => {
  assert.throws(() => inspect({ name: 'x.docx', bytes: enc('PK\u0003\u0004 lixo') }), /corrompido|incompleto/);
  assert.throws(() => inspect({ name: 'x.doc', bytes: Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]) }), /DOC antigo/);
  const locked = new Uint8Array(600);
  locked.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  locked.set(enc('EncryptedPackage'), 100);
  assert.throws(() => inspect({ name: 'x.docx', bytes: locked }), /senha/);
  assert.throws(() => inspect({ name: 'x.txt', bytes: Uint8Array.from([0, 1, 2, 0, 3, 4, 0, 255]) }), /não é texto/);
  assert.throws(() => inspect({ name: 'x.pdf', bytes: enc('isto nao e pdf') }), /não é desse formato/);
  assert.throws(() => inspect({ name: 'x.txt', bytes: new Uint8Array(0) }), /vazio/);
  assert.throws(() => inspect({ name: 'x.docx', bytes: writeZip([{ name: 'foo.txt', data: 'oi' }]) }), /não é um documento de texto/);
  const mismatch = inspect({ name: 'relatorio.docx', bytes: enc('{\\rtf1\\ansi Ol\\\'e1 mundo. Texto de teste para o RTF enganoso.}') });
  assert.equal(mismatch.kind, 'rtf');
  assert.ok(mismatch.doc.meta.notes.some((n) => /extensão/.test(n)));
});

test('zip bomb e macros: recusa por taxa suspeita e nunca executa macros', () => {
  const bomb = writeZip([{ name: 'word/document.xml', data: new Uint8Array(3 * 1024 * 1024) }, { name: '[Content_Types].xml', data: '<x/>' }]);
  assert.throws(() => inspect({ name: 'b.docx', bytes: bomb }), /suspeita/);
  const withMacro = inspect(docx({ macros: true }));
  assert.ok(withMacro.doc.meta.macros);
  assert.ok(withMacro.doc.meta.notes.some((n) => /macros/.test(n)));
});

test('DOCX com capitulos: estrutura, formatacao inline, lista numerada, citacao e metadados', () => {
  const r = inspect(docx({ chapters: 12, words: 3200 }));
  assert.equal(r.kind, 'docx');
  assert.equal(r.doc.title, 'Dom Casmurro de Teste');
  assert.equal(r.doc.author, 'Machado de Assis');
  assert.equal(r.stats.pages, 185);
  assert.equal(r.stats.chapters, 12);
  assert.ok(r.doc.blocks.some((b) => b.t === 'li' && b.ordered));
  assert.ok(r.doc.blocks.some((b) => b.t === 'quote'));
  assert.ok(r.doc.blocks.some((b) => b.t === 'p' && b.text.includes('\u0001Negrito inicial.\u0002')));
  assert.equal(r.recommendation.format, 'epub');
  assert.match(r.recommendation.reason, /12 capítulos/);
});

test('DOCX: sumario do Word e ignorado como conteudo, mas reconhecido; notas de rodape vao ao fim', () => {
  const r = inspect(docx({ toc: true, footnotes: true }));
  assert.ok(r.doc.meta.hasToc);
  assert.ok(!docText(r.doc).includes('Sumário'));
  assert.equal(r.stats.footnotes, 1);
  assert.ok(docText(r.doc).includes('[1]'));
  assert.ok(r.doc.blocks.some((b) => b.note && b.text.includes('Nota de rodapé sobre Capitu')));
});

test('DOCX com tabelas e imagens: tabela preservada em linhas, imagem PNG incorporada', () => {
  const r = inspect(docx({ tables: 2, images: true }));
  const table = r.doc.blocks.find((b) => b.t === 'table');
  assert.deepEqual(table.rows, [['Ano', 'Livro'], ['1899', 'Dom Casmurro']]);
  const img = r.doc.blocks.find((b) => b.t === 'img');
  assert.ok(img.data && img.mime === 'image/png');
  assert.equal(img.alt, 'Capa do livro');
});

test('recomendacao: muitas tabelas largas e imagens apontam para PDF; texto longo para EPUB', () => {
  const pdf = recommend({ words: 2000, chapters: 0, headings: 1, avgParagraph: 80, tables: 9, wideTables: 4, images: 12, charts: 2, footnotes: 0, headerFooter: true, listItems: 0 });
  assert.equal(pdf.format, 'pdf');
  assert.equal(pdf.confidence, 'alta');
  const epub = recommend({ words: 48000, chapters: 12, headings: 30, avgParagraph: 400, tables: 2, wideTables: 0, images: 8, charts: 0, footnotes: 0, headerFooter: false, listItems: 3 });
  assert.equal(epub.format, 'epub');
  assert.match(epub.alternativeNote, /PDF/);
});

test('IA: so decide formato quando as regras nao sao conclusivas e nunca recebe o texto', async () => {
  const r = inspect(docx({ chapters: 5 }));
  let seen = null;
  const advice = await advise(r, async (system, payload) => {
    seen = payload;
    return { formato: 'pdf', motivo: 'Documento com poucos capítulos.', problemas: ['a', 'b'] };
  });
  assert.ok(!JSON.stringify(seen).includes('Capitu olhou'));
  assert.ok(seen.titulos.length > 0);
  assert.ok(['epub', 'pdf'].includes(advice.format));
  const strong = { ...r.recommendation, confidence: 'alta', format: 'epub' };
  assert.equal(applyAdvice(strong, { formato: 'pdf', motivo: 'x' }).format, 'epub');
  assert.equal(applyAdvice(strong, { formato: 'docx' }).format, 'epub');
  const down = await advise(r, async () => { throw new Error('fora do ar'); });
  assert.equal(down.source, 'regras');
});

test('DOCX para EPUB: arquivo valido, abre no leitor, texto identico, imagem e notas', () => {
  const r = inspect(docx({ chapters: 3, images: true, footnotes: true, tables: 1 }));
  const out = convert(r.doc, 'epub', { includeToc: true });
  assert.ok(out.verification.ok, JSON.stringify(out.verification));
  const zip = readZip(out.bytes);
  assert.equal(zip.names()[0], 'mimetype');
  assert.equal(zip.text('mimetype'), 'application/epub+zip');
  const opf = zip.text('OEBPS/content.opf');
  assert.match(opf, /<dc:title>Dom Casmurro de Teste<\/dc:title>/);
  assert.match(opf, /<dc:creator>Machado de Assis<\/dc:creator>/);
  assert.match(opf, /properties="nav"/);
  assert.ok(zip.has('OEBPS/images/img-1.png'));
  assert.ok(zip.has('OEBPS/toc.ncx') && zip.has('OEBPS/nav.xhtml') && zip.has('OEBPS/style.css'));
  zip.names().filter((n) => n.endsWith('.xhtml') || n.endsWith('.opf') || n.endsWith('.ncx')).forEach((n) => {
    const xml = zip.text(n).replace(/<\?xml[^>]*\?>|<!DOCTYPE html>/g, '');
    const stack = [];
    for (const m of xml.matchAll(/<(\/?)([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g)) {
      if (m[4] === '/') continue;
      if (m[1]) assert.equal(stack.pop(), m[2], `${n}: fecha ${m[2]}`);
      else stack.push(m[2]);
    }
    assert.equal(stack.length, 0, `${n}: tags abertas`);
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|#\d+;|#x[0-9a-f]+;)/i.test(xml), `${n}: entidade solta`);
  });
  const parsed = parseEpub(out.bytes);
  assert.ok(parsed.chapters.length >= 3);
  assert.equal(out.chapters, 3);
});

test('EPUB: opcoes de apresentacao vao para o CSS e nao alteram o texto', () => {
  const r = inspect(docx({ chapters: 2 }));
  const a = convert(r.doc, 'epub', { fontSize: 'xlarge', fontFamily: 'sans', align: 'left', margin: 'wide', lineHeight: 1.8 });
  const css = readZip(a.bytes).text('OEBPS/style.css');
  assert.match(css, /font-size: 130%/);
  assert.match(css, /text-align: left/);
  assert.match(css, /margin: 0 10%/);
  assert.match(css, /line-height: 1.8/);
  const b = convert(r.doc, 'epub', { includeImages: false, includeToc: false });
  const body = (out) => alnum(parseEpub(out.bytes).chapters.filter((c) => c.title !== 'Sumário').map((c) => c.content).join(''));
  assert.equal(body(a), body(b));
});

test('DOCX para PDF: paginas, sumario, imagem PNG, tabela e texto conferem', () => {
  const r = inspect(docx({ chapters: 4, images: true, tables: 1, words: 700 }));
  const out = convert(r.doc, 'pdf', { pageSize: 'A5', fontSize: 12, includeToc: true });
  assert.ok(out.verification.ok, JSON.stringify(out.verification));
  assert.ok(out.pages > 6);
  assert.equal(out.imagesIncluded, 1);
  const parsed = parsePdf(out.bytes);
  assert.equal(parsed.pages, out.pages);
  assert.equal(parsed.title, 'Dom Casmurro de Teste');
  assert.ok(parsed.text.includes('Capitu olhou para o mar'));
  assert.ok(parsed.text.includes('Dom Casmurro'));
  assert.equal(out.preview.pages.length, 4);
  const landscape = convert(r.doc, 'pdf', { orientation: 'landscape', pageSize: 'Letter', includeToc: false, header: false, pageNumbers: false });
  assert.ok(landscape.preview.width > landscape.preview.height);
});

test('PDF: caractere fora do alfabeto latino vira aviso, nunca perda silenciosa', () => {
  const r = inspect({ name: 'grego.txt', bytes: enc('Capítulo 1\n\nO símbolo α aparece aqui no meio do texto e também ω, e o texto segue normalmente por mais algumas palavras.') });
  const out = convert(r.doc, 'pdf', {});
  assert.ok(out.nonLatin >= 2);
  assert.ok(out.warnings.some((w) => /fora do alfabeto latino/.test(w)));
  assert.equal(out.verification.ok, false);
});

test('PNG com transparencia e JPEG viram imagens validas no PDF', () => {
  const doc = inspect({ name: 'a.md', bytes: enc('# T\n\ntexto') }).doc;
  doc.blocks.push({ t: 'img', alt: 'png', data: png(5, 5, 6), mime: 'image/png' }, { t: 'img', alt: 'png2', data: png(4, 4, 2), mime: 'image/png' }, { t: 'img', alt: 'jpg', data: JPEG, mime: 'image/jpeg' }, { t: 'img', alt: 'gif', data: Uint8Array.from([71, 73, 70]), mime: 'image/gif' });
  assert.deepEqual(jpegInfo(JPEG) && [jpegInfo(JPEG).width, jpegInfo(JPEG).height], [1, 1]);
  const out = convert(doc, 'pdf', {});
  assert.equal(out.imagesIncluded, 3);
  assert.ok(out.warnings.some((w) => /1 imagem/.test(w)));
  assert.ok(out.verification.ok, JSON.stringify(out.verification));
});

test('JSON: segue o padrao interno e importa como livro', () => {
  const r = inspect(docx({ chapters: 3 }));
  const out = convert(r.doc, 'json', {});
  const data = JSON.parse(out.text);
  assert.deepEqual(Object.keys(data), ['title', 'subtitle', 'category', 'totalPages', 'chapters', 'bookmarks']);
  assert.ok(data.chapters.every((c) => c.title && c.content && Array.isArray(c.marks)));
  assert.ok(data.chapters[0].marks.some((m) => m.type === 'bold' && m.text === 'Negrito inicial.'));
  assert.ok(out.verification.ok);
});

test('livro importado: capitulos, marcas de negrito e italico ancoradas, paginas, aviso', () => {
  const r = inspect(docx({ chapters: 3, footnotes: true }));
  const out = convert(r.doc, 'epub', {});
  const book = toImported(r.doc, out);
  assert.equal(book.chapters.length, 3);
  assert.equal(book.subtitle, 'Por Machado de Assis');
  book.chapters.forEach((c) => c.marks.forEach((m) => assert.equal(c.content.slice(m.start, m.end), m.text)));
  assert.ok(book.chapters[0].marks.some((m) => m.type === 'italic'));
  assert.ok(book.pages >= 1);
  assert.ok(!book.chapters.some((c) => /[\u0001-\u0004]/.test(c.content)));
});

test('ODT: titulos, listas, notas, tabela e metadados', () => {
  const content = '<office:document-content><office:automatic-styles><style:style style:name="T1" style:family="text"><style:text-properties fo:font-style="italic"/></style:style></office:automatic-styles><office:body><office:text><text:h text:outline-level="1">Capítulo Um</text:h><text:p>Texto com <text:span text:style-name="T1">ênfase</text:span> e nota<text:note><text:note-body><text:p>Nota ODT.</text:p></text:note-body></text:note>.</text:p><text:list><text:list-item><text:p>Item A</text:p></text:list-item></text:list><table:table><table:table-row><table:table-cell><text:p>X</text:p></table:table-cell><table:table-cell><text:p>Y</text:p></table:table-cell></table:table-row></table:table><text:h text:outline-level="1">Capítulo Dois</text:h><text:p>Outro texto longo o bastante para existir como capítulo próprio dentro do livro.</text:p></office:text></office:body></office:document-content>';
  const bytes = writeZip([{ name: 'mimetype', data: 'application/vnd.oasis.opendocument.text', store: true }, { name: 'content.xml', data: content }, { name: 'meta.xml', data: '<office:document-meta><dc:title>Livro ODT</dc:title><dc:creator>Ana</dc:creator></office:document-meta>' }]);
  const r = inspect({ name: 'a.odt', bytes });
  assert.equal(r.kind, 'odt');
  assert.equal(r.doc.title, 'Livro ODT');
  assert.equal(r.stats.chapters, 2);
  assert.ok(r.doc.blocks.some((b) => b.t === 'p' && b.text.includes('\u0003ênfase\u0004')));
  assert.ok(r.doc.blocks.some((b) => b.note && b.text === '[1] Nota ODT.'));
  assert.deepEqual(r.doc.blocks.find((b) => b.t === 'table').rows, [['X', 'Y']]);
  ['epub', 'pdf'].forEach((f) => assert.ok(convert(r.doc, f, {}).verification.ok, f));
});

test('RTF: acentos, titulos pelo estilo, negrito, tabela, nota e unicode', () => {
  const rtf = '{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0 Times New Roman;}}{\\stylesheet{\\s1 heading 1;}{\\s2 Normal;}}{\\info{\\title Livro RTF}{\\author Jo\\\'e3o}}\\pard\\s1 Cap\\\'edtulo Um\\par\\pard\\s2 Texto com \\b negrito\\b0  e a\\\'e7\\\'e3o \\u960?\\u233? fim.{\\footnote Nota do RTF.}\\par\\trowd\\intbl A\\cell B\\cell\\row\\pard\\s1 Cap\\\'edtulo Dois\\par\\pard Final do livro com texto suficiente para ser um capítulo.\\par}';
  const r = inspect({ name: 'a.rtf', bytes: Uint8Array.from(rtf, (c) => c.charCodeAt(0) & 255) });
  assert.equal(r.kind, 'rtf');
  assert.equal(r.doc.title, 'Livro RTF');
  assert.equal(r.doc.author, 'João');
  assert.equal(r.stats.chapters, 2);
  const text = docText(r.doc);
  assert.match(text, /ação/);
  assert.match(text, /π/);
  assert.ok(r.doc.blocks.some((b) => b.t === 'p' && b.text.includes('\u0001negrito\u0002')));
  assert.deepEqual(r.doc.blocks.find((b) => b.t === 'table').rows, [['A', 'B']]);
  assert.ok(r.doc.blocks.some((b) => b.note && /Nota do RTF/.test(b.text)));
  assert.ok(convert(r.doc, 'epub', {}).verification.ok);
});

test('Markdown: titulos, listas, tabelas, citacao, enfase e imagem externa como aviso', () => {
  const md = '# Meu Livro\n\n## Parte A\n\nTexto com **negrito** e *itálico* e [link](http://x.y).\n\n- um\n- dois\n\n> citação importante\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n![figura](http://x/y.png)\n\n## Parte B\n\nMais texto.\n';
  const r = inspect({ name: 'livro.md', bytes: enc(md) });
  assert.equal(r.kind, 'md');
  assert.equal(r.doc.title, 'Meu Livro');
  assert.ok(r.doc.blocks.some((b) => b.t === 'p' && b.text.includes('\u0001negrito\u0002') && b.text.includes('\u0003itálico\u0004') && b.text.includes('link') && !b.text.includes('http')));
  assert.ok(r.doc.blocks.some((b) => b.t === 'li' && b.text === 'um'));
  assert.ok(r.doc.blocks.some((b) => b.t === 'quote'));
  assert.deepEqual(r.doc.blocks.find((b) => b.t === 'table').rows, [['a', 'b'], ['1', '2']]);
  assert.ok(r.doc.meta.notes.some((n) => /imagem/.test(n)));
  assert.equal(r.stats.chapters, 2);
});

test('TXT com quebra fixa em largura: une linhas sem alterar palavras; poema e capitulos preservados', () => {
  const wrap = (t) => t.replace(/(.{1,64})(\s|$)/g, '$1\n').trimEnd();
  const par = (n) => wrap(`Capitu olhou para o mar e, depois de muito pensar, resolveu contar tudo à família antes que a noite caísse sobre a casa velha, número ${n}.`);
  const text = `CAPÍTULO I\n\n${par(1)}\n\n${par(2)}\n\nUm verso curto\nOutro verso curto\nTerceiro verso\n\nCAPÍTULO II\n\n${par(3)}\n\n${par(4)}\n`;
  const r = inspect({ name: 'livro.txt', bytes: enc(text) });
  assert.ok(r.doc.meta.hardWrap);
  assert.equal(r.stats.chapters, 2);
  const paragraphs = r.doc.blocks.filter((b) => b.t === 'p');
  assert.equal(paragraphs.length, 4);
  assert.ok(!paragraphs[0].text.includes('\n'));
  assert.equal(alnum(text), alnum(docText(r.doc)));
  assert.ok(r.doc.blocks.some((b) => b.t === 'pre' && b.text.split('\n').length === 3));
});

test('TXT em Windows-1252 (acentos quebrados) e UTF-16 sao decodificados', () => {
  const latin = Uint8Array.from([...enc('Capítulo 1\n\nAções e emoções são ')].slice(0, 0));
  const cp = Uint8Array.from('Cap\xedtulo 1\n\nA\xe7\xf5es e emo\xe7\xf5es s\xe3o textos longos o bastante para valer.', (c) => c.charCodeAt(0));
  assert.ok(docText(inspect({ name: 'a.txt', bytes: cp }).doc).includes('Ações e emoções são'));
  assert.equal(latin.length, 0);
  const utf16 = new Uint8Array(2 + 2 * 40);
  utf16.set([0xff, 0xfe]);
  [...'Texto em utf-16 com acentuação ok.'].forEach((c, i) => { utf16[2 + i * 2] = c.charCodeAt(0) & 255; utf16[3 + i * 2] = c.charCodeAt(0) >> 8; });
  assert.match(docText(inspect({ name: 'u.txt', bytes: utf16 }).doc), /acentuação ok/);
});

test('HTML: titulos, formatacao, tabela, imagem embutida; scripts e imagens externas nao entram', () => {
  const html = `<!doctype html><html lang="pt"><head><title>Página</title><meta name="author" content="Ana"><script>alert(1)</script></head><body><h1>Capítulo A</h1><p>Texto <b>forte</b> &amp; <i>suave</i> com acentuação.</p><script>evil()</script><img src="data:image/png;base64,${Buffer.from(png(2, 2)).toString('base64')}" alt="Pixel"><img src="http://evil/x.png" alt="Externa"><table><tr><td>1</td><td>2</td></tr></table><h1>Capítulo B</h1><ul><li>item</li></ul><blockquote>Citação</blockquote></body></html>`;
  const r = inspect({ name: 'p.html', bytes: enc(html) });
  assert.equal(r.doc.author, 'Ana');
  assert.ok(!docText(r.doc).includes('alert') && !docText(r.doc).includes('evil()'));
  assert.ok(r.doc.blocks.some((b) => b.t === 'p' && b.text.includes('\u0001forte\u0002 & \u0003suave\u0004')));
  assert.equal(r.doc.blocks.filter((b) => b.t === 'img' && b.data).length, 1);
  assert.ok(r.doc.meta.notes.some((n) => /externos/.test(n)));
  assert.equal(r.stats.chapters, 2);
});

test('PDF de entrada: converte para EPUB com ressalva de extracao imperfeita; PDF digitalizado e recusado com clareza', () => {
  const src = inspect(docx({ chapters: 2, words: 300 }));
  const made = convert(src.doc, 'pdf', { includeToc: false });
  const r = inspect({ name: 'entrada.pdf', bytes: made.bytes });
  assert.equal(r.kind, 'pdf');
  assert.equal(r.stats.pages, made.pages);
  assert.ok(r.doc.meta.notes.some((n) => /pode errar/.test(n)));
  assert.ok(r.recommendation.why.pdf.length > 0);
  assert.ok(convert(r.doc, 'epub', {}).verification.ok);
  const scanned = inspect({ name: 's.pdf', bytes: enc('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF') });
  assert.ok(scanned.doc.meta.scanned);
  assert.ok(scanned.stats.problems.some((p) => /Sem texto extraível/.test(p)));
});

test('XML sem estrutura de texto e recusado; XHTML e aceito', () => {
  assert.throws(() => inspect({ name: 'd.xml', bytes: enc('<?xml version="1.0"?><dados><v>1</v><v>2</v></dados>') }), /estrutura de texto/);
  assert.equal(inspect({ name: 'd.xml', bytes: enc('<?xml version="1.0"?><html><body><h1>T</h1><p>Texto suficiente em XHTML para converter.</p></body></html>') }).kind, 'html');
});

test('documento grande: 120 mil palavras convertem em EPUB, PDF e JSON em tempo razoavel', () => {
  const r = inspect(docx({ chapters: 60, words: 2000 }));
  assert.ok(r.stats.words > 100000);
  const t0 = Date.now();
  ['epub', 'pdf', 'json'].forEach((f) => assert.ok(convert(r.doc, f, {}).verification.ok, f));
  assert.ok(Date.now() - t0 < 60000, `demorou ${Date.now() - t0} ms`);
});

test('repeticao da conversao gera o mesmo conteudo e capitulos pequenos nao sao perdidos', () => {
  const r = inspect({ name: 'c.md', bytes: enc('# A\n\n## Curto\n\noi\n\n## Longo\n\nTexto longo o bastante para ficar em um capitulo próprio no livro final.\n\n## Fim\n\nFim do livro com algumas palavras a mais para passar do mínimo.') });
  const a = convert(r.doc, 'epub', {});
  const b = convert(r.doc, 'epub', {});
  assert.equal(alnum(parseEpub(a.bytes).chapters.map((c) => c.content).join('')), alnum(parseEpub(b.bytes).chapters.map((c) => c.content).join('')));
  const chapters = chaptersOf(r.doc);
  assert.ok(chapters.every((c) => c.title.length + c.blocks.length > 0));
  assert.ok(alnum(chapters.map((c) => `${c.title} ${c.blocks.map((x) => x.text || '').join(' ')}`).join(' ')).includes(alnum('oi')));
  assert.ok(verify(r.doc, a).ok);
});
