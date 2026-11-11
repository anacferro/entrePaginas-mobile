export const DISCOVERY_PRESETS = [
  { id: 'br', label: 'Literatura brasileira', hint: 'Romances, contos e crônicas de autores do Brasil.', icon: 'leaf-outline', params: { subject: 'brazilian fiction', language: 'pt' } },
  { id: 'pt', label: 'Língua portuguesa', hint: 'Obras em português de várias épocas e países.', icon: 'language-outline', params: { language: 'pt', query: 'romance' } },
  { id: 'africa', label: 'Vozes africanas', hint: 'Literatura escrita na e sobre a África.', icon: 'earth-outline', params: { subject: 'african fiction' } },
  { id: 'latam', label: 'América Latina', hint: 'Ficção e ensaios de autores latino-americanos.', icon: 'sunny-outline', params: { subject: 'latin american fiction' } },
  { id: 'russia', label: 'Literatura russa', hint: 'Dos grandes romances ao conto curto.', icon: 'snow-outline', params: { subject: 'russian fiction' } },
  { id: 'asia', label: 'Ásia', hint: 'Literatura do Japão, China, Índia e arredores.', icon: 'flower-outline', params: { subject: 'japanese fiction' } },
  { id: 'poesia', label: 'Poesia', hint: 'Versos de várias línguas e séculos.', icon: 'rose-outline', params: { subject: 'poetry' } },
  { id: 'teatro', label: 'Teatro', hint: 'Peças para ler como literatura.', icon: 'film-outline', params: { subject: 'plays' } },
  { id: 'ciencia', label: 'Ciência para leigos', hint: 'Divulgação científica e história das ideias.', icon: 'flask-outline', params: { subject: 'popular science' } },
  { id: 'filosofia', label: 'Filosofia', hint: 'Dos antigos aos modernos.', icon: 'bulb-outline', params: { subject: 'philosophy' } },
  { id: 'sociedade', label: 'Sociedade e cultura', hint: 'Sociologia, antropologia e pensamento social.', icon: 'people-outline', params: { subject: 'sociology' } },
  { id: 'antiguidade', label: 'Antiguidade', hint: 'Textos clássicos gregos e romanos.', icon: 'business-outline', params: { subject: 'classical literature' } },
  { id: 'viagens', label: 'Relatos de viagem', hint: 'Mundos vistos por quem foi até lá.', icon: 'boat-outline', params: { subject: 'voyages and travels' } },
  { id: 'fora-do-radar', label: 'Clássicos fora do radar', hint: 'Um sorteio no acervo do Project Gutenberg, longe dos títulos de sempre.', icon: 'sparkles-outline', params: { random: true } },
];

export function pickPreset(seed = Math.random(), exclude = []) {
  const pool = DISCOVERY_PRESETS.filter((p) => !exclude.includes(p.id));
  return pool[Math.floor(seed * pool.length) % pool.length];
}

export function presetRequest(preset, page = 1, seed = Math.random()) {
  const params = { ...preset.params };
  if (params.random) {
    const language = ['pt', 'en', 'es', 'fr', 'it', 'de'][Math.floor(seed * 6)];
    const offset = Math.floor(seed * 1500) + (page - 1) * 20;
    return { language, offset, page, only: ['gutenberg'], query: '' };
  }
  return { ...params, page, offset: (page - 1) * 20 };
}
