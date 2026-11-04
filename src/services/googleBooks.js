const GOOGLE_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_ENDPOINT = 'https://openlibrary.org/search.json';
const TIMEOUT_MS = 10000;

function secureUrl(url) {
  return url ? url.replace(/^http:/, 'https:') : null;
}

function fromGoogle(item) {
  const info = item.volumeInfo || {};
  return {
    id: item.id,
    title: info.title || 'Sem título',
    authors: (info.authors || []).join(', '),
    description: info.description || '',
    category: info.categories?.[0] || null,
    pageCount: info.pageCount || null,
    thumbnail: secureUrl(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
  };
}

function fromOpenLibrary(doc) {
  return {
    id: doc.key,
    title: doc.title || 'Sem título',
    authors: (doc.author_name || []).slice(0, 3).join(', '),
    description: '',
    category: doc.subject?.[0] || null,
    pageCount: doc.number_of_pages_median || null,
    thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
  };
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

async function searchGoogle(term) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const url =
    `${GOOGLE_ENDPOINT}?q=${encodeURIComponent(term)}&maxResults=8&printType=books` +
    (key ? `&key=${key}` : '');
  const response = await request(url);
  if (!response.ok) {
    const error = new Error('google-unavailable');
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return (data.items || []).map(fromGoogle);
}

async function searchOpenLibrary(term) {
  const fields = 'key,title,author_name,number_of_pages_median,subject,cover_i';
  const response = await request(
    `${OPEN_LIBRARY_ENDPOINT}?q=${encodeURIComponent(term)}&limit=8&fields=${fields}`
  );
  if (!response.ok) throw new Error('open-library-unavailable');
  const data = await response.json();
  return (data.docs || []).map(fromOpenLibrary);
}

export const googleBooks = {
  async search(query) {
    const term = query.trim();
    if (!term) return [];

    try {
      return await searchGoogle(term);
    } catch (googleError) {
      try {
        return await searchOpenLibrary(term);
      } catch (fallbackError) {
        const failure = googleError.name === 'AbortError' || fallbackError.name === 'AbortError'
          ? 'A consulta demorou demais. Verifique a conexão e tente novamente.'
          : googleError instanceof TypeError || fallbackError instanceof TypeError
            ? 'Não foi possível conectar. Verifique a conexão com a internet.'
            : 'As buscas de livros estão indisponíveis agora. Tente novamente em instantes ou preencha manualmente.';
        throw new Error(failure);
      }
    }
  },
};
