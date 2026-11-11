const WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

export const FUNCTION_WORDS = new Set([
  'a', 'o', 'e', 'é', 'à', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'se', 'que',
  'por', 'para', 'pra', 'com', 'sem', 'mas', 'mais', 'me', 'te', 'lhe', 'nem', 'ou', 'ao', 'aos', 'já', 'só', 'eu', 'tu', 'ele',
  'ela', 'nós', 'vós', 'eles', 'elas', 'meu', 'seu', 'sua', 'foi', 'era', 'ser', 'ter', 'há', 'ia', 'vi', 'vê', 'lá', 'cá',
  'the', 'of', 'and', 'to', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'at',
  'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can',
  'el', 'la', 'los', 'las', 'un', 'una', 'y', 'del', 'al', 'lo', 'su', 'es', 'por', 'con', 'una',
]);

export function buildLexicon(text) {
  const freq = new Map();
  const hyphenated = new Set();
  let total = 0;
  (String(text).match(WORD) || []).forEach((word) => {
    const key = word.toLowerCase();
    freq.set(key, (freq.get(key) || 0) + 1);
    total += 1;
  });
  (String(text).match(/[A-Za-zÀ-ÿ]+-[A-Za-zÀ-ÿ]+/g) || []).forEach((word) => hyphenated.add(word.toLowerCase()));
  return {
    total,
    freq: (word) => freq.get(String(word).toLowerCase()) || 0,
    hasHyphenated: (word) => hyphenated.has(String(word).toLowerCase()),
  };
}

function isFragment(lex, part, other) {
  const lower = part.toLowerCase();
  if (FUNCTION_WORDS.has(lower)) return false;
  const own = lex.freq(lower);
  if (own > 2 && own >= lex.freq(other.toLowerCase())) return false;
  return own <= 2;
}

export function repairWords(input, lex) {
  const doubts = [];
  const fixes = { spacedLetters: 0, fragments: 0 };
  let text = input;

  text = text.replace(/(^|[^A-Za-zÀ-ÿ])((?:[A-Za-zÀ-ÿ] ){3,}[A-Za-zÀ-ÿ])(?![A-Za-zÀ-ÿ])/gm, (whole, lead, run) => {
    const joined = run.replace(/ /g, '');
    if (joined.length < 4) return whole;
    const known = lex.freq(joined) >= 1;
    const isUpperRun = joined === joined.toUpperCase() && joined.length >= 5;
    if (known || isUpperRun) {
      fixes.spacedLetters += 1;
      return `${lead}${joined}`;
    }
    doubts.push({ kind: 'letras-separadas', text: run, motivo: 'sem evidência lexical' });
    return whole;
  });

  const pair = /([A-Za-zÀ-ÿ]{2,}) ([a-zà-ÿ]+)(?![A-Za-zÀ-ÿ])/g;
  const decide = (whole, a, b) => {
    const joined = `${a}${b}`;
    if (lex.freq(joined) < 1) return null;
    const aFunc = FUNCTION_WORDS.has(a.toLowerCase());
    const bFunc = FUNCTION_WORDS.has(b.toLowerCase());
    if (aFunc && bFunc) {
      doubts.push({ kind: 'par-ambiguo', text: whole, motivo: 'as duas partes são palavras válidas' });
      return null;
    }
    if ((aFunc || bFunc) && lex.freq(aFunc ? b : a) > 1) {
      doubts.push({ kind: 'par-ambiguo', text: whole, motivo: 'uma das partes é palavra válida' });
      return null;
    }
    if (!isFragment(lex, a, b) && !isFragment(lex, b, a)) {
      doubts.push({ kind: 'par-ambiguo', text: whole, motivo: 'as duas partes aparecem como palavras no livro' });
      return null;
    }
    return joined;
  };

  let rebuilt = '';
  let cursor = 0;
  let match;
  while ((match = pair.exec(text))) {
    const joined = decide(match[0], match[1], match[2]);
    if (joined) {
      rebuilt += text.slice(cursor, match.index) + joined;
      cursor = match.index + match[0].length;
      fixes.fragments += 1;
    } else {
      pair.lastIndex = match.index + match[1].length + 1;
    }
  }
  text = rebuilt + text.slice(cursor);

  return { text, doubts, fixes };
}
