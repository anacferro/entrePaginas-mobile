import { createCatalog } from './catalog/unifiedSearch';
import { storage } from './storage';

export const catalog = createCatalog({
  history: {
    record: (entry) => {
      storage.addCatalogHistory(entry).catch(() => {});
    },
  },
});
