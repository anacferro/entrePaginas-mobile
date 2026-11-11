import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app } from './firebase';
import { createAssistant, parseJson } from './readingAssistant';
import { createCurator } from './recommend/curator';

const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash';
const TIMEOUT_MS = 40000;

const models = {};

function getModel(json) {
  if (!app) {
    throw new Error('O recurso de IA precisa do Firebase configurado. Veja o README.');
  }
  const key = json ? 'json' : 'text';
  if (!models[key]) {
    models[key] = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
      model: MODEL,
      ...(json ? { generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } } : {}),
    });
  }
  return models[key];
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

async function generate(parts, { json = false, timeoutMs = TIMEOUT_MS } = {}) {
  try {
    const result = await Promise.race([
      getModel(json).generateContent(parts),
      new Promise((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), timeoutMs)
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

  ...createAssistant(generate),

  ...createCurator(generate),

  async adviseConversion(system, payload) {
    const raw = await generate([`${system}

DADOS:
${JSON.stringify(payload)}`], { json: true, timeoutMs: 25000 });
    return parseJson(raw);
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
