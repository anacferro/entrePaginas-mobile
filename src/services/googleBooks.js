const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const TIMEOUT_MS = 10000;

function secureUrl(url) {
  return url ? url.replace(/^http:/, 'https:') : null;
}

function toBook(item) {
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

export const googleBooks = {
  async search(query) {
    const term = query.trim();
    if (!term) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(
        `${ENDPOINT}?q=${encodeURIComponent(term)}&maxResults=8&printType=books`,
        { signal: controller.signal }
      );

      if (response.status === 429) {
        throw new Error('O limite de consultas do Google Books foi atingido. Tente novamente em instantes.');
      }
      if (!response.ok) {
        throw new Error('O Google Books não respondeu como esperado. Tente novamente.');
      }

      const data = await response.json();
      return (data.items || []).map(toBook);
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('A consulta ao Google Books demorou demais. Verifique a conexão e tente novamente.');
      }
      if (e instanceof TypeError) {
        throw new Error('Não foi possível conectar ao Google Books. Verifique a conexão com a internet.');
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },
};
