const TABLE = [
  ['pt', 'por', 'Portuguese', 'Português'],
  ['en', 'eng', 'English', 'Inglês'],
  ['es', 'spa', 'Spanish', 'Espanhol'],
  ['fr', 'fre', 'French', 'Francês'],
  ['de', 'ger', 'German', 'Alemão'],
  ['it', 'ita', 'Italian', 'Italiano'],
  ['la', 'lat', 'Latin', 'Latim'],
  ['nl', 'dut', 'Dutch', 'Holandês'],
  ['ru', 'rus', 'Russian', 'Russo'],
  ['ja', 'jpn', 'Japanese', 'Japonês'],
  ['zh', 'chi', 'Chinese', 'Chinês'],
  ['ar', 'ara', 'Arabic', 'Árabe'],
  ['el', 'gre', 'Greek', 'Grego'],
  ['sv', 'swe', 'Swedish', 'Sueco'],
  ['da', 'dan', 'Danish', 'Dinamarquês'],
  ['fi', 'fin', 'Finnish', 'Finlandês'],
  ['no', 'nor', 'Norwegian', 'Norueguês'],
  ['pl', 'pol', 'Polish', 'Polonês'],
  ['cs', 'cze', 'Czech', 'Tcheco'],
  ['hu', 'hun', 'Hungarian', 'Húngaro'],
  ['ca', 'cat', 'Catalan', 'Catalão'],
  ['eo', 'epo', 'Esperanto', 'Esperanto'],
  ['he', 'heb', 'Hebrew', 'Hebraico'],
  ['ko', 'kor', 'Korean', 'Coreano'],
  ['tr', 'tur', 'Turkish', 'Turco'],
  ['hi', 'hin', 'Hindi', 'Hindi'],
  ['yi', 'yid', 'Yiddish', 'Iídiche'],
];

const byAny = new Map();
TABLE.forEach(([iso1, iso3, english, label]) => {
  [iso1, iso3, english.toLowerCase(), label.toLowerCase()].forEach((key) => byAny.set(key, iso1));
});
byAny.set('fra', 'fr');
byAny.set('deu', 'de');
byAny.set('nld', 'nl');
byAny.set('zho', 'zh');
byAny.set('ell', 'el');
byAny.set('ces', 'cs');

export function languageCode(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return null;
  if (byAny.has(key)) return byAny.get(key);
  const base = key.split(/[-_]/)[0];
  return byAny.get(base) || null;
}

export function languageLabel(code) {
  const row = TABLE.find((r) => r[0] === code);
  return row ? row[3] : code ? code.toUpperCase() : 'Idioma não informado';
}

export function languageIso3(code) {
  const row = TABLE.find((r) => r[0] === code);
  return row ? row[1] : null;
}

export const LANGUAGE_OPTIONS = TABLE.slice(0, 10).map(([code, , , label]) => ({ code, label }));
