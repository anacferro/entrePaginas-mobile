import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';

const BATCH_SIZE = 400;
const NETWORK_TIMEOUT_MS = 15000;
const RETRY_MS = 20000;
const DEBOUNCE_MS = 800;

const synced = new Map();
let status = 'idle';
let pending = null;
let timer = null;
let running = false;
let epoch = 0;

function setStatus(next) {
  status = next;
}

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), NETWORK_TIMEOUT_MS)),
  ]);
}

function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

function split(book) {
  const { chapters = [], coverImage, ...rest } = book;
  const meta = /^https?:/.test(coverImage || '') ? { ...rest, coverImage } : rest;
  return {
    meta: clean({ ...meta, title: String(book.title).slice(0, 200), chapterCount: chapters.length }),
    chapters: chapters.map((chapter, order) =>
      clean({
        id: chapter.id,
        title: String(chapter.title || '').slice(0, 200),
        content: String(chapter.content || '').slice(0, 200000),
        marks: chapter.marks || [],
        order,
      })
    ),
  };
}

function signatureOf(book) {
  return JSON.stringify(split(book));
}

function booksRef(uid) {
  return collection(db, 'users', uid, 'books');
}

async function commitInChunks(operations) {
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    operations.slice(i, i + BATCH_SIZE).forEach(apply => apply(batch));
    await withTimeout(batch.commit());
  }
}

async function pushBook(uid, book) {
  const { meta, chapters } = split(book);
  const bookRef = doc(booksRef(uid), book.id);
  const chaptersRef = collection(bookRef, 'chapters');
  const existing = await withTimeout(getDocs(chaptersRef));
  const keep = new Set(chapters.map(chapter => chapter.id));

  const operations = [batch => batch.set(bookRef, meta)];
  chapters.forEach(chapter => operations.push(batch => batch.set(doc(chaptersRef, chapter.id), chapter)));
  existing.forEach(snapshot => {
    if (!keep.has(snapshot.id)) operations.push(batch => batch.delete(snapshot.ref));
  });

  await commitInChunks(operations);
}

async function removeBook(uid, bookId) {
  const bookRef = doc(booksRef(uid), bookId);
  const existing = await withTimeout(getDocs(collection(bookRef, 'chapters')));
  const operations = [];
  existing.forEach(snapshot => operations.push(batch => batch.delete(snapshot.ref)));
  operations.push(batch => batch.delete(bookRef));
  await commitInChunks(operations);
}

async function flush() {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid || !pending || running) return;

  running = true;
  const mine = epoch;
  const list = pending;
  pending = null;
  setStatus('syncing');

  try {
    const ids = new Set(list.map(book => book.id));
    for (const book of list) {
      const signature = signatureOf(book);
      if (synced.get(book.id) !== signature) {
        await pushBook(uid, book);
        if (mine !== epoch) return;
        synced.set(book.id, signature);
      }
    }
    for (const id of [...synced.keys()]) {
      if (!ids.has(id)) {
        await removeBook(uid, id);
        if (mine !== epoch) return;
        synced.delete(id);
      }
    }
    setStatus('synced');
  } catch (e) {
    if (mine !== epoch) return;
    pending = pending || list;
    setStatus(e.code === 'unavailable' || e.code === 'timeout' ? 'offline' : 'error');
    clearTimeout(timer);
    timer = setTimeout(flush, RETRY_MS);
  } finally {
    if (mine === epoch) running = false;
    if (mine === epoch && pending && status === 'synced') {
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    }
  }
}

export const cloud = {
  schedule(list) {
    if (!db || !auth?.currentUser) return;
    pending = list;
    setStatus('syncing');
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  },

  async pullAndMerge(local) {
    const uid = auth?.currentUser?.uid;
    if (!db || !uid) return local;

    setStatus('syncing');
    try {
      const snapshot = await withTimeout(getDocs(booksRef(uid)));
      const byId = new Map(local.map(book => [book.id, book]));

      for (const bookDoc of snapshot.docs) {
        const meta = bookDoc.data();
        const chaptersSnapshot = await withTimeout(getDocs(collection(bookDoc.ref, 'chapters')));
        const { chapterCount, ...rest } = meta;
        const remote = {
          ...rest,
          chapters: chaptersSnapshot.docs
            .map(chapterDoc => chapterDoc.data())
            .sort((a, b) => a.order - b.order)
            .map(({ order, ...chapter }) => chapter),
        };

        const localBook = byId.get(remote.id);
        const remoteIsNewer = !localBook || new Date(remote.updatedAt) > new Date(localBook.updatedAt);

        if (remoteIsNewer) {
          const local = new Map((localBook?.chapters || []).map(c => [c.id, c]));
          remote.chapters = remote.chapters.map((chapter) => {
            const mine = local.get(chapter.id);
            if (!mine || (!mine.photo && !mine.images)) return chapter;
            return { ...chapter, ...(mine.photo ? { photo: mine.photo, photoRatio: mine.photoRatio || null } : {}), ...(mine.images ? { images: mine.images } : {}) };
          });
          if (localBook?.coverImage && !remote.coverImage) remote.coverImage = localBook.coverImage;
          byId.set(remote.id, remote);
          synced.set(remote.id, signatureOf(remote));
        }
      }

      setStatus('synced');
      return [...byId.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      setStatus(e.code === 'unavailable' || e.code === 'timeout' ? 'offline' : 'error');
      return local;
    }
  },

  async wipe() {
    const uid = auth?.currentUser?.uid;
    if (!db || !uid) return true;

    while (running) await new Promise(resolve => setTimeout(resolve, 100));
    clearTimeout(timer);
    pending = null;
    setStatus('syncing');

    try {
      const snapshot = await withTimeout(getDocs(booksRef(uid)));
      for (const bookDoc of snapshot.docs) {
        await removeBook(uid, bookDoc.id);
      }
      synced.clear();
      setStatus('synced');
      return true;
    } catch (e) {
      setStatus(e.code === 'unavailable' || e.code === 'timeout' ? 'offline' : 'error');
      return false;
    }
  },

  reset() {
    epoch += 1;
    clearTimeout(timer);
    synced.clear();
    pending = null;
    running = false;
    setStatus('idle');
  },
};
