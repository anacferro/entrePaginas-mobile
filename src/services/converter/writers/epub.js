import { writeZip } from '../zip.js';
import { chaptersOf, escapeXml, stripMarks, chapterLevelOf } from '../model.js';

export const EPUB_DEFAULTS = {
  fontSize: 'medium',
  fontFamily: 'serif',
  lineHeight: 1.55,
  margin: 'medium',
  align: 'justify',
  split: 'headings',
  includeToc: true,
  includeImages: true,
};

const SIZES = { small: '92%', medium: '100%', large: '115%', xlarge: '130%' };
const MARGINS = { narrow: '3%', medium: '6%', wide: '10%' };
const FAMILIES = {
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

function uuid() {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const pick = (n) => Array.from({ length: n }, hex).join('');
  return `${pick(8)}-${pick(4)}-4${pick(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${pick(3)}-${pick(12)}`;
}

export function inlineXhtml(text) {
  return String(text)
    .split(/([\u0001-\u0004])/)
    .map((part) => {
      if (part === '\u0001') return '<strong>';
      if (part === '\u0002') return '</strong>';
      if (part === '\u0003') return '<em>';
      if (part === '\u0004') return '</em>';
      return escapeXml(part).replace(/\t/g, '&#160;&#160;&#160;&#160;').replace(/\n/g, '<br/>');
    })
    .join('');
}

function languageTag(language) {
  const code = String(language || 'pt').toLowerCase().slice(0, 2);
  return code === 'pt' ? 'pt-BR' : code;
}

function css(o) {
  return `@charset "utf-8";
html { font-size: ${SIZES[o.fontSize] || SIZES.medium}; }
body { margin: 0 ${MARGINS[o.margin] || MARGINS.medium}; font-family: ${FAMILIES[o.fontFamily] || FAMILIES.serif}; line-height: ${o.lineHeight}; text-align: ${o.align === 'left' ? 'left' : 'justify'}; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word; }
h1, h2, h3, h4, h5, h6 { font-weight: bold; line-height: 1.25; text-align: left; hyphens: manual; page-break-after: avoid; }
h1 { font-size: 1.6em; margin: 2em 0 1em; }
h2 { font-size: 1.3em; margin: 1.6em 0 0.7em; }
h3, h4, h5, h6 { font-size: 1.1em; margin: 1.3em 0 0.5em; }
p { margin: 0; text-indent: 1.4em; }
h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p, blockquote + p, figure + p, table + p, pre + p, ul + p, ol + p { text-indent: 0; }
p.note { font-size: 0.9em; text-indent: 0; margin-top: 0.4em; }
blockquote { margin: 1em 1.5em; font-style: italic; }
blockquote p { text-indent: 0; }
ul, ol { margin: 0.8em 0; padding-left: 1.6em; }
li { text-indent: 0; margin: 0.2em 0; }
pre { white-space: pre-wrap; font-family: inherit; margin: 1em 0; text-align: left; }
figure { margin: 1.2em 0; text-align: center; }
img { max-width: 100%; height: auto; }
.table-wrap { overflow-x: auto; margin: 1em 0; }
table { border-collapse: collapse; width: 100%; font-size: 0.9em; }
td, th { border: 1px solid #999; padding: 0.3em 0.5em; text-align: left; vertical-align: top; }
.missing { text-align: center; font-style: italic; text-indent: 0; }
.cover { text-align: center; margin-top: 30%; }
.cover h1 { font-size: 2em; margin: 0 0 0.6em; }
.cover p { text-indent: 0; font-size: 1.1em; }
`;
}

function xhtml(title, body, lang) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${body}
</body>
</html>
`;
}

export function buildEpub(doc, options = {}) {
  const o = { ...EPUB_DEFAULTS, ...options };
  const lang = languageTag(doc.language);
  const title = o.title || doc.title || 'Livro convertido';
  const author = doc.author || '';
  const chapters = chaptersOf(doc, { split: o.split });
  const baseLevel = o.split === 'none' ? chapterLevelOf(doc) || 1 : chapterLevelOf({ blocks: doc.blocks.filter((b) => !(b.t === 'h' && b.level === 0)) }) || 1;
  const warnings = [];
  const images = [];
  let imageSkipped = 0;

  const renderBlocks = (blocks) => {
    let out = '';
    let list = null;
    const closeList = () => {
      if (list) {
        out += `</${list}>\n`;
        list = null;
      }
    };
    blocks.forEach((block) => {
      if (block.t !== 'li') closeList();
      if (block.t === 'h') {
        const shift = o.split === 'none' ? 2 : 1;
        const tag = Math.min(6, Math.max(2, block.level - baseLevel + shift));
        out += `<h${tag}>${inlineXhtml(stripMarks(block.text))}</h${tag}>\n`;
      } else if (block.t === 'li') {
        const tag = block.ordered ? 'ol' : 'ul';
        if (list !== tag) {
          closeList();
          out += `<${tag}>\n`;
          list = tag;
        }
        out += `<li>${inlineXhtml(block.text)}</li>\n`;
      } else if (block.t === 'quote') out += `<blockquote><p>${inlineXhtml(block.text)}</p></blockquote>\n`;
      else if (block.t === 'pre') out += `<pre>${inlineXhtml(block.text)}</pre>\n`;
      else if (block.t === 'table') {
        out += '<div class="table-wrap"><table>\n';
        block.rows.forEach((row) => {
          out += `<tr>${row.map((cell) => `<td>${inlineXhtml(cell)}</td>`).join('')}</tr>\n`;
        });
        out += '</table></div>\n';
      } else if (block.t === 'img') {
        if (block.data && o.includeImages && EXT[block.mime]) {
          const name = `img-${images.length + 1}.${EXT[block.mime]}`;
          images.push({ name, mime: block.mime, data: block.data });
          out += `<figure><img src="images/${name}" alt="${escapeXml(block.alt || '')}"/></figure>\n`;
        } else {
          if (block.data && !o.includeImages) imageSkipped += 1;
          out += `<p class="missing">${block.alt ? `[Imagem: ${escapeXml(block.alt)}]` : '[Imagem]'}</p>\n`;
        }
      } else if (block.note) out += `<p class="note">${inlineXhtml(block.text)}</p>\n`;
      else out += `<p>${inlineXhtml(block.text)}</p>\n`;
    });
    closeList();
    return out;
  };

  const files = [];
  const chapterFiles = chapters.map((chapter, i) => {
    const name = `chap-${String(i + 1).padStart(3, '0')}.xhtml`;
    const body = `<h1>${inlineXhtml(chapter.title)}</h1>\n${renderBlocks(chapter.blocks)}`;
    files.push({ name: `OEBPS/${name}`, data: xhtml(chapter.title, body, lang) });
    return { name, title: chapter.title, id: `chap${i + 1}` };
  });

  if (imageSkipped) warnings.push(`${imageSkipped} imagem(ns) ficaram de fora porque você desmarcou a inclusão de imagens.`);

  const tocItems = chapterFiles.map((c) => `<li><a href="${c.name}">${escapeXml(c.title)}</a></li>`).join('\n');
  const nav = xhtml(
    'Sumário',
    `<nav epub:type="toc" id="toc"><h1>Sumário</h1>\n<ol>\n${tocItems}\n</ol></nav>\n<nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="bodymatter" href="${chapterFiles[0].name}">Início do livro</a></li></ol></nav>`,
    lang
  );
  const id = `urn:uuid:${uuid()}`;
  const coverBody = `<div class="cover"><h1>${inlineXhtml(title)}</h1>${author ? `<p>${escapeXml(author)}</p>` : ''}</div>`;

  const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${id}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>
<docTitle><text>${escapeXml(title)}</text></docTitle>
<navMap>
${chapterFiles.map((c, i) => `<navPoint id="np${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapeXml(c.title)}</text></navLabel><content src="${c.name}"/></navPoint>`).join('\n')}
</navMap>
</ncx>
`;

  const manifest = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '<item id="css" href="style.css" media-type="text/css"/>',
    '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>',
    ...chapterFiles.map((c) => `<item id="${c.id}" href="${c.name}" media-type="application/xhtml+xml"/>`),
    ...images.map((img, i) => `<item id="img${i + 1}" href="images/${img.name}" media-type="${img.mime}"/>`),
  ];
  const spine = ['<itemref idref="cover"/>', ...(o.includeToc ? ['<itemref idref="nav"/>'] : []), ...chapterFiles.map((c) => `<itemref idref="${c.id}"/>`)];

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${id}</dc:identifier>
<dc:title>${escapeXml(title)}</dc:title>
${author ? `<dc:creator>${escapeXml(author)}</dc:creator>\n` : ''}<dc:language>${lang}</dc:language>
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>
${manifest.join('\n')}
</manifest>
<spine toc="ncx">
${spine.join('\n')}
</spine>
</package>
`;

  const zipFiles = [
    { name: 'mimetype', data: 'application/epub+zip', store: true },
    {
      name: 'META-INF/container.xml',
      data: '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n</container>\n',
    },
    { name: 'OEBPS/content.opf', data: opf },
    { name: 'OEBPS/nav.xhtml', data: nav },
    { name: 'OEBPS/toc.ncx', data: ncx },
    { name: 'OEBPS/style.css', data: css(o) },
    { name: 'OEBPS/cover.xhtml', data: xhtml(title, coverBody, lang) },
    ...files,
    ...images.map((img) => ({ name: `OEBPS/images/${img.name}`, data: img.data, store: true })),
  ];

  return {
    format: 'epub',
    bytes: writeZip(zipFiles),
    mime: 'application/epub+zip',
    extension: 'epub',
    chapters: chapters.length,
    toc: chapterFiles.map((c) => c.title),
    imagesIncluded: images.length,
    warnings,
    options: o,
  };
}
