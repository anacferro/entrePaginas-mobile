const SEARCH_ENDPOINT = 'https://www.gutenberg.org/ebooks/search.opds/';
const TEXT_ENDPOINT = 'https://www.gutenberg.org/cache/epub';
const TIMEOUT_MS = 30000;
const MAX_CHARS = 1200000;
const MAX_HTML = 3500000;

export function normalize(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ATTEMPTS = 3;

async function attempt(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request(url) {
  let failure;
  for (let i = 0; i < ATTEMPTS; i += 1) {
    try {
      const response = await attempt(url);
      if (response.status < 500 && response.status !== 429) return response;
      failure = new Error(`http-${response.status}`);
    } catch (error) {
      failure = error;
    }
    if (i < ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
  }
  throw failure;
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

function toEntry(entry) {
  return {
    id: entry.id,
    title: entry.title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    language: entry.title.match(/\(([^)]*)\)\s*$/)?.[1]?.trim() || 'English',
    author: /downloads?$/i.test(entry.author.trim()) ? '' : entry.author.trim(),
  };
}

export function letterKey(title) {
  const first = normalize(title).replace(/\s/g, '')[0];
  return first && /[a-z]/.test(first) ? first.toUpperCase() : '#';
}

const API_PAGE = 25;
const BROWSE_PAGE = 30;
const GRID = [1, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
const probes = new Map();
const starts = new Map();

const LIST_CAP = 4976;

async function fetchPage(language, index, order = 'title') {
  const response = await request(`${SEARCH_ENDPOINT}?sort_order=${order}&query=l.${language}&start_index=${index}`);
  if (response.status === 400) return [];
  if (!response.ok) throw new Error('gutenberg-unavailable');
  return parseEntries(await response.text()).map(toEntry);
}

async function probe(language, index) {
  const id = `${language}:${index}`;
  if (!probes.has(id)) {
    const entries = await fetchPage(language, index);
    probes.set(id, entries[0] ? letterKey(entries[0].title) : null);
  }
  return probes.get(id);
}

const reaches = (key, letter) => key === null || key >= letter;

async function letterStart(language, letter) {
  if (letter === '#') return 1;
  const cacheId = `${language}:${letter}`;
  if (starts.has(cacheId)) return starts.get(cacheId);

  const keys = await Promise.all(GRID.map(index => probe(language, index)));
  const found = keys.findIndex(key => reaches(key, letter));
  let start;

  if (found === 0) {
    start = 1;
  } else if (found === -1) {
    start = GRID[GRID.length - 1];
  } else {
    let low = GRID[found - 1];
    let high = GRID[found];
    while (high - low > API_PAGE) {
      const points = [...new Set(
        Array.from({ length: 8 }, (_, j) => low + Math.round(((high - low) * (j + 1)) / 9))
      )].filter(point => point > low && point < high);
      const sample = await Promise.all(points.map(point => probe(language, point)));
      const hit = sample.findIndex(key => reaches(key, letter));
      if (hit === -1) {
        low = points[points.length - 1];
      } else {
        high = points[hit];
        if (hit > 0) low = points[hit - 1];
      }
    }
    start = low;
  }

  starts.set(cacheId, start);
  return start;
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

async function downloadHtml(id) {
  for (const url of [`${TEXT_ENDPOINT}/${id}/pg${id}-images.html`, `${TEXT_ENDPOINT}/${id}/pg${id}.html`]) {
    try {
      const response = await request(url);
      if (!response.ok) continue;
      const html = await response.text();
      if (html.length <= MAX_HTML && /<(b|strong|i|em)[\s>]/i.test(html)) return html;
    } catch {
      continue;
    }
  }
  return null;
}

async function downloadText(id) {
  for (const url of [`${TEXT_ENDPOINT}/${id}/pg${id}.txt`, `https://www.gutenberg.org/files/${id}/${id}-0.txt`, `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`]) {
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
      .map(toEntry)
      .filter(entry => {
        const haystack = normalize(`${entry.title} ${entry.author}`);
        return words.every(word => haystack.includes(word));
      })
      .filter((entry, index, all) => all.findIndex(other => other.title === entry.title && other.author === entry.author) === index)
      .slice(0, 25);
  },

  async isCapped(language) {
    return (await probe(language, LIST_CAP)) !== null;
  },

  async browse(language, requestedLetter, cursor, popular = false) {
    const letter = popular ? null : requestedLetter;
    const order = popular ? 'downloads' : 'title';
    let position = cursor || (letter ? await letterStart(language, letter) : 1);
    const books = [];
    let done = false;
    let filled = false;

    while (!filled && !done) {
      const pages = await Promise.all([position, position + API_PAGE].map(index => fetchPage(language, index, order)));
      const entries = pages.flat();
      if (entries.length === 0) {
        done = true;
        break;
      }

      for (let i = 0; i < entries.length; i += 1) {
        const key = letterKey(entries[i].title);
        if (letter && key > letter) {
          done = true;
          break;
        }
        if (!letter || key === letter) {
          books.push(entries[i]);
          if (books.length === BROWSE_PAGE) {
            position += i + 1;
            filled = true;
            break;
          }
        }
      }

      if (!filled && !done) position += entries.length;
    }

    return { entries: books, cursor: position, hasMore: !done };
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
      const html = await downloadHtml(id);
      if (html) return html;
      const raw = await downloadText(id);
      if (!raw) return null;
      const text = stripGutenberg(raw);
      return text.length > 2000 && text.length <= MAX_CHARS ? text : null;
    } catch {
      return null;
    }
  },
};
