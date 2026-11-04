const SEARCH_ENDPOINT = 'https://gutendex.com/books';
const TIMEOUT_MS = 20000;

function normalize(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function textUrlOf(formats) {
  const key = Object.keys(formats || {}).find(k => k.startsWith('text/plain'));
  return key ? formats[key] : null;
}

function surnameMatches(book, authors) {
  const wanted = normalize(authors);
  if (!wanted) return true;
  return (book.authors || []).some(author => {
    const surname = normalize(author.name.split(',')[0]);
    return surname && wanted.includes(surname);
  });
}

function stripGutenberg(raw) {
  let text = raw.replace(/\r\n?/g, '\n');
  const start = text.search(/\*\*\* ?START OF[^\n]*\n/i);
  if (start >= 0) text = text.slice(text.indexOf('\n', start) + 1);
  const end = text.search(/\*\*\* ?END OF/i);
  if (end >= 0) text = text.slice(0, end);
  return text.trim();
}

export const publicDomain = {
  async findFullText(title, authors) {
    try {
      const response = await request(`${SEARCH_ENDPOINT}?search=${encodeURIComponent(title)}`);
      if (!response.ok) return null;
      const data = await response.json();
      const wantedTitle = normalize(title);

      const match = (data.results || []).find(
        book =>
          textUrlOf(book.formats) &&
          normalize(book.title).startsWith(wantedTitle) &&
          surnameMatches(book, authors)
      );
      if (!match) return null;

      const textResponse = await request(textUrlOf(match.formats));
      if (!textResponse.ok) return null;
      const text = stripGutenberg(await textResponse.text());
      return text.length > 2000 ? text : null;
    } catch {
      return null;
    }
  },
};
