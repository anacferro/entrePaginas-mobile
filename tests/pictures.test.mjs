import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deflate, inflate } from 'pako';
import { parsePdf } from '../src/services/pdfParser.js';
import { parseEpub } from '../src/services/epubParser.js';
import { writeZip, crc32 } from '../src/services/converter/zip.js';
import { imageSize, mimeOf, jpegInfo } from '../src/services/pictures/format.js';
import { paginate, splitPage } from '../src/services/pagination.js';
import { keepPictures, coverCandidates, guessCover, anchorPictures } from '../src/services/pictures/select.js';

const latin = (text) => Uint8Array.from(text, (c) => c.charCodeAt(0));
const join = (parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  parts.forEach((p) => {
    out.set(p, at);
    at += p.length;
  });
  return out;
};

function pdfWith(images) {
  const objects = [
    latin('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'),
    latin('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'),
    latin(`3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /XObject << ${images.map((_, i) => `/Im${i} ${5 + i} 0 R`).join(' ')} >> >> /Contents 4 0 R >> endobj\n`),
  ];
  const content = images.map((_, i) => `q 200 0 0 200 10 10 cm /Im${i} Do Q`).join('\n');
  objects.push(latin(`4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`));
  images.forEach((image, i) => {
    objects.push(latin(`${5 + i} 0 obj << /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ${image.dict} /Length ${image.data.length} >> stream\n`));
    objects.push(image.data, latin('\nendstream endobj\n'));
    if (image.extra) objects.push(latin(image.extra));
  });
  return join([latin('%PDF-1.4\n'), ...objects, latin('%%EOF')]);
}

function gradient(width, height, comps) {
  const rows = new Uint8Array(width * height * comps);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let c = 0; c < comps; c += 1) rows[(y * width + x) * comps + c] = (x * 2 + y + c * 40) & 255;
    }
  }
  return rows;
}

function decodePng(png) {
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  const chunks = {};
  const idat = [];
  while (at < png.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    const data = png.subarray(at + 8, at + 8 + length);
    assert.equal(view.getUint32(at + 8 + length), crc32(png.subarray(at + 4, at + 8 + length)), `crc ${type}`);
    if (type === 'IDAT') idat.push(data);
    else chunks[type] = data;
    at += 12 + length;
  }
  const head = new DataView(chunks.IHDR.buffer, chunks.IHDR.byteOffset, 13);
  return { width: head.getUint32(0), height: head.getUint32(4), bitDepth: chunks.IHDR[8], colorType: chunks.IHDR[9], palette: chunks.PLTE, data: inflate(join(idat)) };
}

test('PDF: imagem RGB comprimida vira PNG valido com os mesmos pixels', () => {
  const rows = gradient(200, 150, 3);
  const bytes = pdfWith([{ width: 200, height: 150, dict: '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode', data: deflate(rows) }]);
  const { pictures } = parsePdf(bytes, { rebuild: false, pictures: true });
  assert.equal(pictures.length, 1);
  assert.equal(pictures[0].mime, 'image/png');
  const png = decodePng(pictures[0].bytes);
  assert.equal(png.width, 200);
  assert.equal(png.height, 150);
  assert.equal(png.colorType, 2);
  for (let y = 0; y < 150; y += 1) {
    assert.equal(png.data[y * 601], 0);
    assert.deepEqual([...png.data.subarray(y * 601 + 1, (y + 1) * 601)], [...rows.subarray(y * 600, (y + 1) * 600)]);
  }
});

test('PDF: preditor PNG, tons de cinza e indexada', () => {
  const gray = gradient(200, 130, 1);
  const filtered = new Uint8Array(201 * 130);
  for (let y = 0; y < 130; y += 1) filtered.set(gray.subarray(y * 200, (y + 1) * 200), y * 201 + 1);
  const predicted = { width: 200, height: 130, dict: '/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /Columns 200 /BitsPerComponent 8 >>', data: deflate(filtered) };

  const indexes = new Uint8Array(200 * 130).map((_, i) => i % 4);
  const palette = '<ff0000 00ff00 0000ff ffff00>';
  const indexed = { width: 200, height: 130, dict: `/ColorSpace [/Indexed /DeviceRGB 3 ${palette}] /BitsPerComponent 8 /Filter /FlateDecode`, data: deflate(indexes) };

  const { pictures } = parsePdf(pdfWith([predicted, indexed]), { rebuild: false, pictures: true });
  assert.equal(pictures.length, 2);
  const a = decodePng(pictures[0].bytes);
  assert.equal(a.colorType, 0);
  assert.deepEqual([...a.data], [...filtered]);
  const b = decodePng(pictures[1].bytes);
  assert.equal(b.colorType, 3);
  assert.deepEqual([...b.palette], [255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0]);
  assert.equal(b.data[1 + 1], 1);
  assert.equal(b.width, 200);
});

test('PDF: JPEG segue direto e CMYK, mascara e filtros desconhecidos sao ignorados', () => {
  const jpeg = (components) => Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 150, 0, 200, components, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9]);
  const rgbJpeg = jpeg(3);
  assert.deepEqual({ ...jpegInfo(rgbJpeg) }, { height: 150, width: 200, components: 3 });
  const bytes = pdfWith([
    { width: 200, height: 150, dict: '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode', data: rgbJpeg },
    { width: 200, height: 150, dict: '/ColorSpace /DeviceCMYK /BitsPerComponent 8 /Filter /DCTDecode', data: jpeg(4) },
    { width: 200, height: 150, dict: '/ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode', data: Uint8Array.from([1, 2, 3]) },
    { width: 200, height: 150, dict: '/ImageMask true /BitsPerComponent 1 /Filter /FlateDecode', data: deflate(new Uint8Array(25 * 150)) },
  ]);
  const { pictures } = parsePdf(bytes, { rebuild: false, pictures: true });
  assert.equal(pictures.length, 1);
  assert.equal(pictures[0].mime, 'image/jpeg');
  assert.deepEqual([...pictures[0].bytes], [...rgbJpeg]);
});

test('PDF: JPEG CMYK real e convertido em JPEG RGB com as cores certas', () => {
  const cmyk = new Uint8Array(fs.readFileSync(new URL('./fixtures/cmyk.jpg', import.meta.url)));
  assert.equal(jpegInfo(cmyk).components, 4);
  const bytes = pdfWith([{ width: 200, height: 150, dict: '/ColorSpace /DeviceCMYK /BitsPerComponent 8 /Decode [1 0 1 0 1 0 1 0] /Filter /DCTDecode', data: cmyk }]);
  const { pictures } = parsePdf(bytes, { rebuild: false, pictures: true });
  assert.equal(pictures.length, 1);
  assert.equal(pictures[0].mime, 'image/jpeg');
  const info = jpegInfo(pictures[0].bytes);
  assert.deepEqual([info.width, info.height, info.components], [200, 150, 3]);
});

test('PDF sem pedido de imagens nao devolve nada e nao muda o texto', () => {
  const bytes = pdfWith([{ width: 200, height: 150, dict: '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode', data: deflate(gradient(200, 150, 3)) }]);
  assert.deepEqual(parsePdf(bytes, { rebuild: false }).pictures, []);
});

test('formato: reconhece tipo e tamanho', () => {
  const png = decodePngSample();
  assert.equal(mimeOf(png), 'image/png');
  assert.deepEqual({ ...imageSize(png) }, { mime: 'image/png', width: 3, height: 2, components: 3 });
  assert.equal(mimeOf(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 5, 0, 4, 0])), 'image/gif');
  assert.equal(mimeOf(Uint8Array.from([1, 2, 3, 4])), null);
});

function decodePngSample() {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0, 0, 2]);
  return bytes;
}

const picture = (o) => ({ id: o.id, pageIndex: o.pageIndex ?? 0, width: o.width ?? 400, height: o.height ?? 300, bytes: new Uint8Array(o.size ?? 5000), ...o });

test('selecao: nada e descartado, so ficam de fora imagens sem dados', () => {
  const list = [
    picture({ id: 1, width: 40, height: 40 }),
    picture({ id: 2, width: 800, height: 20 }),
    picture({ id: 4, width: 300, height: 300, pageIndex: 2, size: 4 * 1024 * 1024 }),
    ...[0, 1, 2, 3].map((pageIndex) => picture({ id: 9, pageIndex, width: 200, height: 200 })),
    { id: 7, width: 300, height: 300, bytes: new Uint8Array(0) },
  ];
  assert.deepEqual(keepPictures(list).map((p) => p.id), [1, 2, 4, 9, 9, 9, 9]);
});

test('capa: candidatas so das primeiras paginas, retrato primeiro', () => {
  const list = [
    picture({ id: 'a', pageIndex: 5, width: 600, height: 900 }),
    picture({ id: 'b', pageIndex: 0, width: 900, height: 500 }),
    picture({ id: 'c', pageIndex: 0, width: 450, height: 700 }),
    picture({ id: 'd', pageIndex: 1, width: 100, height: 100 }),
  ];
  assert.deepEqual(coverCandidates(list).map((p) => p.id), ['c', 'b']);
  assert.equal(guessCover(list).id, 'c');
  assert.equal(guessCover([picture({ id: 'x', pageIndex: 0, width: 900, height: 500 })]), null);
});

test('posicao: imagem cai no paragrafo proximo da posicao relativa no livro', () => {
  const chapters = [
    { id: 'a', content: `${'x'.repeat(100)}\n\n${'y'.repeat(100)}` },
    { id: 'b', content: `${'z'.repeat(100)}\n\n${'w'.repeat(100)}` },
  ];
  const placed = anchorPictures([{ id: 1, r: 0.1 }, { id: 2, r: 0.6 }, { id: 3, r: 0.99 }], chapters, (p) => p.r);
  assert.deepEqual(placed[0].map((p) => [p.id, p.offset]), [[1, 100]]);
  assert.deepEqual(placed[1].map((p) => [p.id, p.offset]), [[2, 100], [3, 202]]);
});

test('EPUB: capa vem do pacote e nao e repetida no corpo', () => {
  const epub = parseEpub(new Uint8Array(fs.readFileSync(new URL('./fixtures/dom-casmurro.epub', import.meta.url))));
  assert.equal(epub.cover.mime, 'image/jpeg');
  assert.deepEqual([epub.cover.width, epub.cover.height], [450, 726]);
  assert.deepEqual(epub.pictures, []);
});

test('EPUB: imagem no meio do texto vira figura na posicao relativa e sai do texto', () => {
  const png = decodePngSample();
  const page = `<html><body><h1>Um</h1><p>${'Primeiro trecho do capitulo. '.repeat(10)}</p><p><img src="img/foto.png" alt=""/></p><p>${'Segundo trecho do capitulo. '.repeat(10)}</p></body></html>`;
  const files = [
    { name: 'mimetype', data: 'application/epub+zip', store: true },
    { name: 'META-INF/container.xml', data: '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>' },
    { name: 'OEBPS/content.opf', data: '<package><metadata><dc:title>T</dc:title></metadata><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/><item id="i1" href="img/foto.png" media-type="image/png"/></manifest><spine><itemref idref="c1"/></spine></package>' },
    { name: 'OEBPS/c1.xhtml', data: page },
    { name: 'OEBPS/img/foto.png', data: png },
  ];
  const epub = parseEpub(writeZip(files));
  assert.equal(epub.pictures.length, 1);
  assert.equal(epub.pictures[0].id, 'OEBPS/img/foto.png');
  assert.ok(epub.pictures[0].ratio > 0.4 && epub.pictures[0].ratio < 0.6);
  assert.ok(!/[]/.test(epub.chapters[0].content));
  assert.equal(epub.cover, null);
});

test('paginacao: figura vai para a pagina em que o deslocamento cai, inclusive no fim do capitulo', () => {
  const content = Array.from({ length: 12 }, (_, i) => `Paragrafo ${i} ${'texto '.repeat(60)}`).join('\n\n');
  const chapter = { id: 'c', content, images: [{ id: 'i1', uri: 'u1', offset: 10 }, { id: 'i2', uri: 'u2', offset: Math.floor(content.length / 2) }, { id: 'i3', uri: 'u3', offset: content.length }] };
  const pages = paginate([chapter]);
  assert.ok(pages.length >= 3);
  const placed = pages.flatMap((p) => p.images.map((i) => i.id));
  assert.deepEqual(placed, ['i1', 'i2', 'i3']);
  assert.deepEqual(pages[0].images.map((i) => i.id), ['i1']);
  assert.deepEqual(pages[pages.length - 1].images.map((i) => i.id), ['i3']);
  assert.ok(paginate([{ id: 'x', content: 'curto' }])[0].images.length === 0);
});

test('figura fica entre os paragrafos, na posicao do livro, sem partir frases', () => {
  const content = 'Primeiro paragrafo do capitulo.\n\nSegundo paragrafo com mais texto.\n\nTerceiro paragrafo.';
  const offset = content.indexOf('mais texto');
  const [page] = paginate([{ id: 'c1', content, marks: [{ start: 0, end: 8, color: 'y' }], images: [{ id: 'i1', uri: 'u', offset, width: 10, height: 5 }] }]);
  const parts = splitPage(page);
  assert.deepEqual(parts.map((p) => p.type), ['text', 'image', 'text']);
  assert.ok(parts[0].content.trim().endsWith('Segundo paragrafo com mais texto.'));
  assert.equal(parts[2].content.trim(), 'Terceiro paragrafo.');
  assert.equal(parts[0].first, true);
  assert.equal(parts[2].first, false);
  assert.equal(parts[0].marks.length, 1);
  assert.equal(parts.map((p) => p.content || '').join('').replace(/\s+/g, ' ').trim(), content.replace(/\s+/g, ' '));
});

test('posicao: figura com texto vizinho cai exatamente antes do paragrafo que vem depois dela', () => {
  const filler = 'Texto de enchimento sem relacao nenhuma. '.repeat(40);
  const chapters = [{ id: 'c', content: `${filler}\n\nPrimeiro paragrafo da pagina nova com bastante texto.\n\n${filler}\n\nSegundo bloco bem diferente do outro.\n\n${filler}` }];
  const picture = { id: 1, pageIndex: 3, width: 400, height: 300, bytes: new Uint8Array(1), anchor: { after: ['Segundo bloco bem diferente'], before: [] } };
  const [list] = anchorPictures([picture], chapters, () => 0.05);
  const at = list[0].offset;
  assert.ok(chapters[0].content.slice(at).startsWith('Segundo bloco bem diferente'));
});
