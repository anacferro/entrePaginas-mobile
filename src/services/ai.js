import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { app } from './firebase';
import { parseSuggestion } from './suggestion';
import { CATEGORIES } from '../theme/bookOptions';

const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash';
const TIMEOUT_MS = 40000;
const MAX_CHARS = 24000;

let model = null;
let jsonModel = null;

const SUGGESTION_SCHEMA = Schema.object({
  properties: {
    category: Schema.string(),
    tags: Schema.array({ items: Schema.string() }),
    synopsis: Schema.string(),
  },
});

function getModel() {
  if (!app) {
    throw new Error('O recurso de IA precisa do Firebase configurado. Veja o README.');
  }
  if (!model) {
    model = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), { model: MODEL });
  }
  return model;
}

function getJsonModel() {
  if (!app) {
    throw new Error('O recurso de IA precisa do Firebase configurado. Veja o README.');
  }
  if (!jsonModel) {
    jsonModel = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json', responseSchema: SUGGESTION_SCHEMA },
    });
  }
  return jsonModel;
}

function friendly(error) {
  const text = String(error?.message || error);
  if (error?.code === 'timeout') {
    return 'A IA demorou demais para responder. Tente novamente.';
  }
  if (/404|no longer available|not found/i.test(text)) {
    return 'O modelo de IA configurado não está mais disponível. Defina outro em EXPO_PUBLIC_GEMINI_MODEL.';
  }
  if (/failed to fetch|network request failed|offline|unavailable/i.test(text) && !/\[\d{3}/.test(text)) {
    return 'Sem conexão com a internet. Verifique a rede e tente novamente.';
  }
  if (/429|quota|rate/i.test(text)) {
    return 'O limite de uso da IA foi atingido. Tente novamente em alguns minutos.';
  }
  if (/403|permission|disabled|not enabled|API has not/i.test(text)) {
    return 'O serviço de IA ainda não está habilitado neste projeto Firebase.';
  }
  return 'Não foi possível usar a IA agora. O restante do app continua funcionando.';
}

async function generate(parts, pickModel = getModel) {
  try {
    const result = await Promise.race([
      pickModel().generateContent(parts),
      new Promise((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), TIMEOUT_MS)
      ),
    ]);
    const text = result.response.text().trim();
    if (!text) throw new Error('A IA não retornou texto.');
    return text;
  } catch (e) {
    console.warn('Falha na chamada de IA:', e);
    const wrapped = new Error(e.message === 'A IA não retornou texto.' ? e.message : friendly(e));
    wrapped.cause = e;
    throw wrapped;
  }
}

async function readBase64(uri) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ data: String(reader.result).split(',')[1], mimeType: blob.type || 'image/jpeg' });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return { data: await new File(uri).base64(), mimeType: 'image/jpeg' };
}

export const ai = {
  isAvailable: Boolean(app),

  summarizeChapter(title, content) {
    const text = content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) : content;
    return generate([
      'Resuma o capítulo abaixo em português do Brasil, em no máximo 5 linhas, ' +
        'com linguagem simples e sem inventar informações que não estejam no texto. ' +
        'Responda apenas com o resumo, sem títulos nem marcadores.\n\n' +
        `Título: ${title}\n\n${text}`,
    ]);
  },

  async suggestMetadata(title, text) {
    const excerpt = text.length > 6000 ? text.slice(0, 6000) : text;
    const raw = await generate(
      [
        'Você ajuda a catalogar livros. Com base no título e no trecho abaixo, responda somente em JSON ' +
          'com as chaves: "category" (exatamente uma entre: ' + CATEGORIES.join(', ') + '), ' +
          '"tags" (de 3 a 5 etiquetas curtas em minúsculas, em português) e ' +
          '"synopsis" (resumo de uma frase com até 150 caracteres, sem inventar fatos). ' +
          'Se o texto for insuficiente, use tags vazias e synopsis vazia.\n\n' +
          'Título: ' + (title || 'sem título') + '\n\nTrecho:\n' + excerpt,
      ],
      getJsonModel
    );
    return parseSuggestion(raw, CATEGORIES);
  },

  async transcribePhoto(uri) {
    let image;
    try {
      image = await readBase64(uri);
    } catch {
      throw new Error('Não foi possível ler a foto para transcrição.');
    }
    return generate([
      'Transcreva fielmente o texto desta página de livro, em português, mantendo os parágrafos. ' +
        'Não resuma, não traduza e não comente. Se não houver texto legível, responda exatamente: SEM_TEXTO.',
      { inlineData: image },
    ]);
  },
};
