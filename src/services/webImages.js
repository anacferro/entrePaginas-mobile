const DB_NAME = 'entrepaginas-images';
const STORE = 'img';
const PREFIX = 'idb-img:';
const cache = new Map();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, run) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

let counter = 0;

export const webImages = {
  isStored: (uri) => typeof uri === 'string' && uri.startsWith(PREFIX),

  async save(blob) {
    counter += 1;
    const key = `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
    await withStore('readwrite', (store) => store.put(blob, key));
    return `${PREFIX}${key}`;
  },

  async saveBytes(bytes, mime) {
    return this.save(new Blob([bytes], { type: mime }));
  },

  async resolve(uri) {
    if (!this.isStored(uri)) return uri;
    if (cache.has(uri)) return cache.get(uri);
    const blob = await withStore('readonly', (store) => store.get(uri.slice(PREFIX.length)));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    cache.set(uri, url);
    return url;
  },

  async moveDataUri(uri) {
    if (typeof uri !== 'string' || !uri.startsWith('data:')) return uri;
    const blob = await (await fetch(uri)).blob();
    return this.save(blob);
  },

  remove(uris) {
    uris.filter((u) => this.isStored(u)).forEach((u) => {
      withStore('readwrite', (store) => store.delete(u.slice(PREFIX.length))).catch(() => {});
      const url = cache.get(u);
      if (url) URL.revokeObjectURL(url);
      cache.delete(u);
    });
  },
};
