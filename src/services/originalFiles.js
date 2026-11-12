import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const DB_NAME = 'entrepaginas-originals';
const STORE = 'pdf';

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

export const originalFiles = {
  supported: Platform.OS === 'web' || Platform.OS === 'ios',

  async save(bookId, bytes) {
    if (Platform.OS === 'web') {
      await withStore('readwrite', (store) => store.put(new Blob([bytes], { type: 'application/pdf' }), bookId));
      return `idb:${bookId}`;
    }
    const dir = new Directory(Paths.document, 'originals');
    dir.create({ idempotent: true, intermediates: true });
    const file = new File(dir, `${bookId}.pdf`);
    file.create({ overwrite: true });
    await file.write(bytes);
    return `originals/${bookId}.pdf`;
  },

  async uri(path) {
    if (!path) return null;
    if (Platform.OS === 'web') {
      if (!path.startsWith('idb:')) return null;
      const blob = await withStore('readonly', (store) => store.get(path.slice(4)));
      return blob ? URL.createObjectURL(blob) : null;
    }
    const file = new File(Paths.document, path);
    return file.exists ? file.uri : null;
  },

  remove(bookIds) {
    if (Platform.OS === 'web') {
      bookIds.forEach((id) => withStore('readwrite', (store) => store.delete(id)).catch(() => {}));
      return;
    }
    bookIds.forEach((id) => {
      try {
        const file = new File(Paths.document, 'originals', `${id}.pdf`);
        if (file.exists) file.delete();
      } catch {
        return;
      }
    });
  },
};
