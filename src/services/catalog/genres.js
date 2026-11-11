import { normalize } from './text.js';

export const GENRES = [
  { key: 'fantasia', label: 'Fantasia', words: ['fantasy', 'fantasia', 'magic', 'magia', 'fairy tales', 'contos de fadas', 'dragons', 'wizards'] },
  { key: 'ficcao-cientifica', label: 'Ficção científica', words: ['science fiction', 'ficcao cientifica', 'dystopia', 'distopia', 'utopia', 'space', 'robots', 'time travel'] },
  { key: 'romance', label: 'Romance', words: ['romance', 'love stories', 'amor', 'romantic'] },
  { key: 'suspense', label: 'Suspense', words: ['suspense', 'thriller', 'espionage', 'espionagem'] },
  { key: 'misterio', label: 'Mistério', words: ['mystery', 'misterio', 'detective', 'policial', 'crime', 'murder'] },
  { key: 'terror', label: 'Terror', words: ['horror', 'terror', 'ghost', 'fantasmas', 'gothic', 'gotico', 'vampires', 'supernatural'] },
  { key: 'aventura', label: 'Aventura', words: ['adventure', 'aventura', 'sea stories', 'voyages', 'pirates', 'exploration'] },
  { key: 'drama', label: 'Drama', words: ['drama', 'family life', 'tragedy', 'tragedia', 'psychological fiction'] },
  { key: 'ficcao-historica', label: 'Ficção histórica', words: ['historical fiction', 'ficcao historica', 'historical novel', 'romance historico'] },
  { key: 'filosofia', label: 'Filosofia', words: ['philosophy', 'filosofia', 'ethics', 'etica', 'metaphysics', 'metafisica', 'logic', 'stoic', 'existential'] },
  { key: 'psicologia', label: 'Psicologia', words: ['psychology', 'psicologia', 'psychoanalysis', 'psicanalise', 'mind', 'behavior'] },
  { key: 'desenvolvimento-pessoal', label: 'Desenvolvimento pessoal', words: ['self-help', 'autoajuda', 'personal development', 'success', 'habits', 'habitos', 'motivation'] },
  { key: 'biografia', label: 'Biografia', words: ['biography', 'biografia', 'autobiography', 'autobiografia', 'memoir', 'memorias', 'diaries', 'letters'] },
  { key: 'historia', label: 'História', words: ['history', 'historia', 'civilization', 'war', 'guerra', 'empire', 'imperio', 'colonial'] },
  { key: 'classico', label: 'Literatura clássica', words: ['classic', 'classico', 'classics', 'literature', 'literatura', 'fiction', 'ficcao', 'novels', 'romances brasileiros', 'brazilian fiction'] },
  { key: 'poesia', label: 'Poesia', words: ['poetry', 'poesia', 'poems', 'poemas', 'verse', 'sonnets', 'sonetos'] },
  { key: 'ciencia', label: 'Ciência', words: ['science', 'ciencia', 'physics', 'fisica', 'biology', 'biologia', 'chemistry', 'quimica', 'astronomy', 'astronomia', 'mathematics', 'matematica', 'evolution', 'natural history'] },
  { key: 'politica', label: 'Política', words: ['politics', 'politica', 'political science', 'democracy', 'democracia', 'government', 'governo', 'socialism', 'capitalism'] },
  { key: 'sociologia', label: 'Sociedade e cultura', words: ['sociology', 'sociologia', 'anthropology', 'antropologia', 'culture', 'cultura', 'social', 'education', 'educacao', 'economics', 'economia'] },
  { key: 'teatro', label: 'Teatro', words: ['drama (theatre)', 'plays', 'teatro', 'theater', 'theatre', 'comedia'] },
  { key: 'contos', label: 'Contos e crônicas', words: ['short stories', 'contos', 'cronicas', 'chronicles', 'essays', 'ensaios'] },
  { key: 'infantil', label: 'Infantil e juvenil', words: ['juvenile', 'infantil', 'children', 'young adult', 'juvenil', 'fables', 'fabulas'] },
  { key: 'religiao', label: 'Religião e espiritualidade', words: ['religion', 'religiao', 'bible', 'biblia', 'spirituality', 'espiritualidade', 'theology', 'teologia', 'buddhism'] },
];

export const GENRE_LABELS = Object.fromEntries(GENRES.map((g) => [g.key, g.label]));

export function genresOf(subjects = [], title = '') {
  const text = ` ${normalize([...(subjects || []), title].join(' | '))} `;
  const scores = GENRES.map((genre) => ({
    key: genre.key,
    score: genre.words.reduce((sum, word) => (text.includes(` ${normalize(word)} `) || text.includes(` ${normalize(word)}`) ? sum + 1 : sum), 0),
  })).filter((g) => g.score > 0);
  scores.sort((a, b) => b.score - a.score);
  const specific = scores.filter((g) => g.key !== 'classico');
  const pool = specific.length ? specific : scores;
  return pool.slice(0, 2).map((g) => g.key);
}

export function genreLabel(key) {
  return GENRE_LABELS[key] || key;
}
