import { createCatalog, languageList } from './catalog/unifiedSearch';
import { storage } from './storage';

const base = createCatalog({
  readableOnly: true,
  strictLanguages: true,
  history: {
    record: (entry) => {
      storage.addCatalogHistory(entry).catch(() => {});
    },
  },
});

async function readingLanguages() {
  try {
    const personal = await storage.getPersonal();
    return personal.declared.languages;
  } catch {
    return [];
  }
}

async function withLanguages(input = {}) {
  if (languageList(input).length) return input;
  const languages = await readingLanguages();
  return languages.length ? { ...input, languages } : input;
}

export const catalog = {
  ...base,
  search: async (input) => base.search(await withLanguages(input)),
  browse: async (input) => base.browse(await withLanguages(input)),
};
