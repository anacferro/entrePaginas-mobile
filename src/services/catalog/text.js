export function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARTICLES = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'the', 'an', 'el', 'la', 'los', 'las', 'le', 'les', 'il', 'der', 'die', 'das']);

export function titleKey(title) {
  const main = String(title || '').split(/[:;]|\s[-–—]\s|\(/)[0];
  const words = normalize(main).split(' ').filter(Boolean);
  while (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join(' ');
}

export function authorKey(authors) {
  const list = Array.isArray(authors) ? authors : String(authors || '').split(/[;,&]| e | and /);
  const first = normalize(list.find((a) => normalize(a)) || '');
  if (!first) return '';
  const parts = first.split(' ').filter(Boolean);
  return parts[parts.length - 1];
}

export function authorFull(authors) {
  const list = Array.isArray(authors) ? authors : [authors];
  return list.map((a) => normalize(a)).filter(Boolean).sort().join('|');
}

export function flipName(name) {
  const text = String(name || '').trim();
  if (!text.includes(',')) return text;
  const [last, first] = text.split(',').map((p) => p.trim());
  return first ? `${first} ${last}` : last;
}

export function cleanIsbn(value) {
  const digits = String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  return digits.length === 10 || digits.length === 13 ? digits : null;
}

export function isbn10to13(isbn10) {
  if (!/^\d{9}[\dX]$/.test(isbn10)) return null;
  const core = `978${isbn10.slice(0, 9)}`;
  const sum = core.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return core + ((10 - (sum % 10)) % 10);
}

export function isbnKey(value) {
  const isbn = cleanIsbn(value);
  if (!isbn) return null;
  return isbn.length === 10 ? isbn10to13(isbn) : isbn;
}

export function yearOf(value) {
  const match = String(value || '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : null;
}

export function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanAuthor(name) {
  return flipName(
    String(name || '')
      .replace(/\(?\d{3,4}\??\s*[-–]\s*\d{0,4}\??\)?/g, ' ')
      .replace(/\s+,/g, ',')
      .replace(/\s+/g, ' ')
      .replace(/[,;]\s*$/, '')
      .trim()
  );
}
