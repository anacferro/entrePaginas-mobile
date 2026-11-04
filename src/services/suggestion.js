export class FormatError extends Error {}

const FORMAT_MESSAGE =
  'A IA respondeu fora do formato esperado, então nada foi alterado. Você pode tentar de novo ou preencher manualmente.';

export function parseSuggestion(raw, categories) {
  let data;
  try {
    data = JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  } catch {
    throw new FormatError(FORMAT_MESSAGE);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new FormatError(FORMAT_MESSAGE);
  }

  const result = {};

  if (typeof data.category === 'string') {
    const match = categories.find(c => c.toLowerCase() === data.category.trim().toLowerCase());
    if (match) result.category = match;
  }

  if (Array.isArray(data.tags)) {
    const tags = [
      ...new Set(
        data.tags
          .filter(tag => typeof tag === 'string')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length <= 24)
      ),
    ].slice(0, 5);
    if (tags.length > 0) result.tags = tags;
  }

  if (typeof data.synopsis === 'string' && data.synopsis.trim()) {
    result.synopsis = data.synopsis.trim().slice(0, 200);
  }

  if (Object.keys(result).length === 0) throw new FormatError(FORMAT_MESSAGE);
  return result;
}
