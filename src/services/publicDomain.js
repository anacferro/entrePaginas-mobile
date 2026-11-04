const SEARCH_ENDPOINT = 'https://www.gutenberg.org/ebooks/search.opds/';
const TEXT_ENDPOINT = 'https://www.gutenberg.org/cache/epub';
const TIMEOUT_MS = 30000;
const MAX_CHARS = 1200000;

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

function decode(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function parseEntries(xml) {
  const entries = [];
  const pattern = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = pattern.exec(xml))) {
    const id = match[1].match(/\/ebooks\/(\d+)\.opds/)?.[1];
    const title = match[1].match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const author = match[1].match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || '';
    if (id && title) entries.push({ id, title: decode(title), author: decode(author) });
  }
  return entries;
}

function authorMatches(entryAuthor, authors) {
  const wanted = normalize(authors);
  if (!wanted) return true;
  const words = normalize(entryAuthor).split(' ').filter(word => word.length > 3);
  return words.some(word => wanted.includes(word));
}

function stripGutenberg(raw) {
  let text = raw.replace(/\r\n?/g, '\n');
  const start = text.search(/\*\*\* ?START OF[^\n]*\n/i);
  if (start >= 0) text = text.slice(text.indexOf('\n', start) + 1);
  const end = text.search(/\*\*\* ?END OF/i);
  if (end >= 0) text = text.slice(0, end);
  return text.trim();
}

async function downloadText(id) {
  for (const url of [`${TEXT_ENDPOINT}/${id}/pg${id}.txt`, `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`]) {
    try {
      const response = await request(url);
      if (response.ok) return await response.text();
    } catch {
      continue;
    }
  }
  return null;
}

export const publicDomain = {
  async search(term) {
    const response = await request(`${SEARCH_ENDPOINT}?query=${encodeURIComponent(term).replace(/%20/g, '+')}`);
    if (!response.ok) throw new Error('gutenberg-unavailable');

    const words = normalize(term).split(' ').filter(word => word.length > 2);
    return parseEntries(await response.text())
      .map(entry => ({
        id: entry.id,
        title: entry.title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
        author: /downloads?$/i.test(entry.author.trim()) ? '' : entry.author.trim(),
      }))
      .filter(entry => {
        const haystack = normalize(`${entry.title} ${entry.author}`);
        return words.every(word => haystack.includes(word));
      })
      .filter((entry, index, all) => all.findIndex(other => other.title === entry.title && other.author === entry.author) === index)
      .slice(0, 12);
  },

  async findEntry(title, authors) {
    try {
      const query = `${title} ${authors || ''}`.trim();
      const response = await request(`${SEARCH_ENDPOINT}?query=${encodeURIComponent(query).replace(/%20/g, '+')}`);
      if (!response.ok) return null;

      const wantedTitle = normalize(title.split(':')[0]);
      const match = parseEntries(await response.text()).find(
        entry =>
          normalize(entry.title.replace(/\([^)]*\)\s*$/, '')).startsWith(wantedTitle) &&
          authorMatches(entry.author, authors)
      );
      return match ? { id: match.id } : null;
    } catch {
      return null;
    }
  },

  async findFullText(title, authors, onStage, knownId) {
    try {
      onStage?.('search');
      const id = knownId || (await this.findEntry(title, authors))?.id;
      if (!id) return null;

      onStage?.('download');
      const raw = await downloadText(id);
      if (!raw) return null;
      const text = stripGutenberg(raw);
      return text.length > 2000 && text.length <= MAX_CHARS ? text : null;
    } catch {
      return null;
    }
  },
};
