import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_BOOKS, INITIAL_USER } from './mockData';
import { relocateMarks } from './marks';
import { cloud } from './cloud';
import { bookFonts } from './bookFonts';
import * as readingLog from './readingLog';
import { normalizePrefs } from './readerPrefs';
import * as personalData from './personal.js';
import { DEFAULT_COVER_COLOR, DEFAULT_TITLE_COLOR, DEFAULT_PAPER_COLOR } from '../theme/bookOptions';

let userId = null;
let queue = Promise.resolve();

const newId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const exclusive = (task) => {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
};

const keyFor = (name) => `@entre_paginas_${name}_v1${userId ? `_${userId}` : ''}`;

const KEYS = {
  get BOOKS() { return userId ? keyFor('books') : '@entre_paginas_books_v1'; },
  get USER() { return userId ? keyFor('user') : '@entre_paginas_user_v1'; },
  get POSITIONS() { return userId ? keyFor('positions') : '@entre_paginas_positions_v1'; },
  get READING() { return userId ? keyFor('reading') : '@entre_paginas_reading_v1'; },
  get CHARACTERS() { return userId ? keyFor('characters') : '@entre_paginas_characters_v1'; },
  get READER_PREFS() { return userId ? keyFor('reader_prefs') : '@entre_paginas_reader_prefs_v1'; },
  get PERSONAL() { return userId ? keyFor('personal') : '@entre_paginas_personal_v1'; },
  get CATALOG_HISTORY() { return userId ? keyFor('catalog_history') : '@entre_paginas_catalog_history_v1'; },
};

async function saveBooks(list) {
  await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(list));
  cloud.schedule(list);
}

async function loadReading() {
  const json = await AsyncStorage.getItem(KEYS.READING);
  return readingLog.normalizeLog(json ? JSON.parse(json) : null);
}

async function loadPersonal() {
  const json = await AsyncStorage.getItem(KEYS.PERSONAL);
  try {
    return personalData.normalizePersonal(json ? JSON.parse(json) : null);
  } catch {
    return personalData.normalizePersonal(null);
  }
}

async function changePersonal(change) {
  const personal = await loadPersonal();
  change(personal);
  await AsyncStorage.setItem(KEYS.PERSONAL, JSON.stringify(personal));
  return personal;
}

async function changeReading(change) {
  const log = await loadReading();
  change(log);
  await AsyncStorage.setItem(KEYS.READING, JSON.stringify(log));
  return log;
}

async function dropPositions(ids) {
  const json = await AsyncStorage.getItem(KEYS.POSITIONS);
  if (json) {
    const positions = JSON.parse(json);
    const before = Object.keys(positions).length;
    ids.forEach(id => delete positions[id]);
    if (Object.keys(positions).length !== before) {
      await AsyncStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions));
    }
  }
  const mapsJson = await AsyncStorage.getItem(KEYS.CHARACTERS);
  if (mapsJson) {
    const maps = JSON.parse(mapsJson);
    ids.forEach(id => delete maps[id]);
    await AsyncStorage.setItem(KEYS.CHARACTERS, JSON.stringify(maps));
  }
  const readingJson = await AsyncStorage.getItem(KEYS.READING);
  if (readingJson) await changeReading(log => readingLog.dropBooks(log, ids));
}

const PAGE_SIZE = 1800;

function pagesOf(chapters) {
  const chars = (chapters || []).reduce((sum, chapter) => sum + (chapter.content || '').length, 0);
  return Math.max(1, Math.ceil(chars / PAGE_SIZE));
}

function syncPages(book) {
  if (book.isOwn !== false) book.totalPages = pagesOf(book.chapters);
}

function logChange(book, type, chapterTitle, before, after) {
  if (book.isOwn !== false) return;
  book.changeLog = [
    {
      id: newId('change'),
      type,
      chapterTitle,
      before: before ? { title: before.title, content: before.content } : null,
      after: after ? { title: after.title, content: after.content } : null,
      date: new Date().toISOString(),
    },
    ...(book.changeLog || []),
  ];
}

function profileFor(authUser) {
  if (!authUser) return INITIAL_USER;
  return {
    readerTheme: INITIAL_USER.readerTheme,
    fontSize: INITIAL_USER.fontSize,
    name: authUser.displayName || authUser.email.split('@')[0],
    email: authUser.email,
  };
}

export const storage = {
  setUser(uid) {
    userId = uid || null;
    if (!uid) cloud.reset();
  },

  async syncFromCloud() {
    const owner = userId;
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const local = json ? JSON.parse(json) : [];
    const merged = await cloud.pullAndMerge(local);
    if (owner !== userId) return;
    await saveBooks(merged);
  },

  async init(authUser) {
    try {
      const stored = await AsyncStorage.getItem(KEYS.BOOKS);
      if (!stored) {
        await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(authUser ? [] : INITIAL_BOOKS));
      }
      const user = await AsyncStorage.getItem(KEYS.USER);
      if (!user) {
        await AsyncStorage.setItem(KEYS.USER, JSON.stringify(profileFor(authUser)));
      }
    } catch (e) {
      console.error('Erro ao inicializar AsyncStorage:', e);
    }
  },

  async getBooks(delayMs = 400) {
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }

    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : INITIAL_BOOKS;
    return list.filter(b => b.status === 'estante');
  },

  async getChestBooks(delayMs = 400) {
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }

    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : INITIAL_BOOKS;
    return list.filter(b => b.status === 'bau');
  },

  async getBookById(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : INITIAL_BOOKS;
    return list.find(b => b.id === id) || null;
  },

  async addBook(bookData) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];

    const newBook = {
      id: newId('book'),
      title: bookData.title?.trim() || 'Nova Obra Sem Título',
      subtitle: bookData.subtitle?.trim() || 'Obra artesanal recém-encadernada',
      category: bookData.category || 'Geral',
      tags: bookData.tags || [],
      coverColor: bookData.coverColor || DEFAULT_COVER_COLOR,
      titleColor: bookData.titleColor || DEFAULT_TITLE_COLOR,
      paperColor: bookData.paperColor || DEFAULT_PAPER_COLOR,
      fontFamily: bookData.fontFamily || 'serif',
      fontFallback: bookData.fontFallback || null,
      coverImage: bookData.coverImage || null,
      status: 'estante',
      isOwn: bookData.isOwn !== false,
      textPending: bookData.textPending || null,
      catalog: bookData.catalog || null,
      normalization: bookData.normalization || null,
      bookmarks: [],
      changeLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: bookData.chapters && bookData.chapters.length > 0 ? bookData.chapters : [
        {
          id: newId('chap'),
          title: 'Primeiras Linhas',
          content: bookData.initialContent || 'Aqui começa a encadernação deste livro. As páginas em branco acolhem as ideias recém-nascidas do leitor e do autor.'
        }
      ]
    };

    newBook.totalPages = bookData.totalPages || pagesOf(newBook.chapters);

    list.unshift(newBook);
    await saveBooks(list);
    return newBook;
  },

  async updateBook(bookId, updates) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.title = updates.title?.trim() || book.title;
    book.subtitle = updates.subtitle?.trim() || book.subtitle;
    book.category = updates.category || book.category;
    if (updates.tags) book.tags = updates.tags;
    book.coverColor = updates.coverColor || book.coverColor;
    book.titleColor = updates.titleColor || book.titleColor;
    book.paperColor = updates.paperColor || book.paperColor;
    book.fontFamily = updates.fontFamily || book.fontFamily;
    if (updates.customFont) {
      book.customFont = updates.customFont;
      book.fontPath = updates.fontPath || null;
      book.fontLabel = updates.fontLabel || null;
    }
    if ('coverImage' in updates) book.coverImage = updates.coverImage || null;
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async setBookContent(bookId, { chapters, pages }) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.chapters = chapters;
    book.totalPages = pages;
    book.textPending = null;
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async setBookLocked(bookId, locked) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.locked = !!locked;
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async addChapter(bookId, chapterData) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    const newChapter = {
      id: newId('chap'),
      title: chapterData.title?.trim() || `Capítulo ${book.chapters.length + 1}`,
      content: chapterData.content || '',
      photo: chapterData.photo || null,
    };

    book.chapters.push(newChapter);
    syncPages(book);
    logChange(book, 'add', newChapter.title, null, newChapter);
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async updateChapter(bookId, chapterId, updates) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    const chapter = book?.chapters.find(c => c.id === chapterId);
    if (!chapter) return null;

    const before = { title: chapter.title, content: chapter.content, photo: chapter.photo };
    chapter.title = updates.title?.trim() || chapter.title;
    chapter.content = updates.content ?? chapter.content;
    if ('photo' in updates) chapter.photo = updates.photo;

    const photoChanged = (before.photo || null) !== (chapter.photo || null);
    if (before.title === chapter.title && before.content === chapter.content && !photoChanged) {
      return book;
    }

    chapter.marks = relocateMarks(chapter.marks, chapter.content);
    syncPages(book);
    logChange(book, 'edit', chapter.title, before, chapter);
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async moveChapter(bookId, chapterId, direction) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    const from = book.chapters.findIndex(c => c.id === chapterId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= book.chapters.length) return book;

    const [chapter] = book.chapters.splice(from, 1);
    book.chapters.splice(to, 0, chapter);
    logChange(book, 'move', chapter.title, { title: `Posição ${from + 1}` }, { title: `Posição ${to + 1}` });
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async deleteChapter(bookId, chapterId) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    const removed = book.chapters.find(c => c.id === chapterId);
    book.chapters = book.chapters.filter(c => c.id !== chapterId);
    book.bookmarks = (book.bookmarks || []).filter(bm => bm.chapterId !== chapterId);
    syncPages(book);
    if (removed) logChange(book, 'delete', removed.title, removed, null);
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async updateChapterMarks(bookId, chapterId, marks) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    const chapter = book?.chapters.find(c => c.id === chapterId);
    if (!chapter) return null;

    chapter.marks = marks;
    await saveBooks(list);
    return book;
  },

  async addBookmark(bookId, bookmarkData) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.bookmarks = [
      ...(book.bookmarks || []).filter(bm => !(bm.chapterId === bookmarkData.chapterId && bm.page === bookmarkData.page)),
      {
        id: newId('pin'),
        chapterId: bookmarkData.chapterId,
        title: bookmarkData.title?.trim() || 'Marcador',
        color: bookmarkData.color,
        page: bookmarkData.page,
        createdAt: new Date().toISOString(),
      },
    ];
    await saveBooks(list);
    return book;
  },

  async addComment(bookId, { chapterId, page, text }) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.comments = [
      ...(book.comments || []),
      {
        id: newId('comment'),
        chapterId,
        page,
        text: String(text).slice(0, 2000),
        createdAt: new Date().toISOString(),
      },
    ];
    await saveBooks(list);
    return book;
  },

  async removeComment(bookId, commentId) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.comments = (book.comments || []).filter(cm => cm.id !== commentId);
    await saveBooks(list);
    return book;
  },

  async removeBookmark(bookId, bookmarkId) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.bookmarks = (book.bookmarks || []).filter(bm => bm.id !== bookmarkId);
    await saveBooks(list);
    return book;
  },

  async moveToChest(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const index = list.findIndex(b => b.id === id);
    if (index !== -1) {
      list[index].status = 'bau';
      list[index].updatedAt = new Date().toISOString();
      await saveBooks(list);
    }
    return list;
  },

  async restoreFromChest(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const index = list.findIndex(b => b.id === id);
    if (index !== -1) {
      list[index].status = 'estante';
      list[index].updatedAt = new Date().toISOString();
      await saveBooks(list);
    }
    return list;
  },

  async restoreAllFromChest() {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    list.forEach(b => {
      if (b.status === 'bau') {
        b.status = 'estante';
        b.updatedAt = new Date().toISOString();
      }
    });
    await saveBooks(list);
    return list;
  },

  async emptyChest() {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const remaining = list.filter(b => b.status !== 'bau');
    const dropped = list.filter(b => b.status === 'bau').map(b => b.id);
    bookFonts.remove(dropped);
    await dropPositions(dropped);
    await saveBooks(remaining);
    return remaining;
  },

  async deleteBookPermanently(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const filtered = list.filter(b => b.id !== id);
    bookFonts.remove([id]);
    await dropPositions([id]);
    await saveBooks(filtered);
    return filtered;
  },

  async deleteBooksPermanently(ids) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const drop = new Set(ids);
    const filtered = list.filter(b => !drop.has(b.id));
    bookFonts.remove(ids);
    await dropPositions(ids);
    await saveBooks(filtered);
    return filtered;
  },

  async getCharacterMap(bookId) {
    const json = await AsyncStorage.getItem(KEYS.CHARACTERS);
    try {
      return (json ? JSON.parse(json) : {})[bookId] || null;
    } catch {
      return null;
    }
  },

  async setCharacterMap(bookId, map) {
    const json = await AsyncStorage.getItem(KEYS.CHARACTERS);
    const maps = json ? JSON.parse(json) : {};
    maps[bookId] = map;
    await AsyncStorage.setItem(KEYS.CHARACTERS, JSON.stringify(maps));
  },

  async getReaderPrefs(bookId) {
    const json = await AsyncStorage.getItem(KEYS.READER_PREFS);
    try {
      const data = json ? JSON.parse(json) : null;
      if (data && data.books) return normalizePrefs(data.books[bookId] || null);
      return normalizePrefs(data);
    } catch {
      return normalizePrefs(null);
    }
  },

  async setReaderPrefs(bookId, prefs) {
    const json = await AsyncStorage.getItem(KEYS.READER_PREFS);
    let data = null;
    try {
      data = json ? JSON.parse(json) : null;
    } catch {
      data = null;
    }
    const books = data && data.books ? data.books : {};
    const legacy = data && !data.books ? data : null;
    if (legacy) {
      const all = await storage.getBooks(0);
      all.forEach((b) => {
        books[b.id] = normalizePrefs(legacy);
      });
    }
    books[bookId] = normalizePrefs(prefs);
    await AsyncStorage.setItem(KEYS.READER_PREFS, JSON.stringify({ books }));
  },

  async getCatalogHistory() {
    const json = await AsyncStorage.getItem(KEYS.CATALOG_HISTORY);
    try {
      const list = json ? JSON.parse(json) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  async addCatalogHistory(entry) {
    const list = await this.getCatalogHistory();
    await AsyncStorage.setItem(KEYS.CATALOG_HISTORY, JSON.stringify([entry, ...list].slice(0, 60)));
  },

  async clearCatalogHistory() {
    await AsyncStorage.removeItem(KEYS.CATALOG_HISTORY);
  },

  async getReadingPosition(bookId) {
    const json = await AsyncStorage.getItem(KEYS.POSITIONS);
    const positions = json ? JSON.parse(json) : {};
    return positions[bookId] || 1;
  },

  async setReadingPosition(bookId, page) {
    const json = await AsyncStorage.getItem(KEYS.POSITIONS);
    const positions = json ? JSON.parse(json) : {};
    positions[bookId] = page;
    await AsyncStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions));
  },

  async getReadingOverview() {
    const [positionsJson, log] = await Promise.all([AsyncStorage.getItem(KEYS.POSITIONS), loadReading()]);
    return { positions: positionsJson ? JSON.parse(positionsJson) : {}, log };
  },

  async openReading(bookId, total) {
    const positionsJson = await AsyncStorage.getItem(KEYS.POSITIONS);
    const position = (positionsJson ? JSON.parse(positionsJson) : {})[bookId] || 1;
    return changeReading(log => readingLog.openBook(log, { bookId, position, total, now: new Date() }));
  },

  async recordReadingStep(bookId, from, to, total) {
    return changeReading(log => readingLog.recordPageChange(log, { bookId, from, to, total, now: new Date() }));
  },

  async registerReadingPage(bookId, page, total) {
    return changeReading(log => readingLog.registerPage(log, { bookId, page, total, now: new Date() }));
  },

  async setReadingFinished(bookId, finished, total) {
    return changeReading(log => readingLog.setFinished(log, { bookId, finished, total, now: new Date() }));
  },

  async getPersonal() {
    return loadPersonal();
  },

  async updatePersonal(change) {
    return changePersonal(change);
  },

  async rateWork(info) {
    return changePersonal(p => personalData.setRating(p, info));
  },

  async rateDetails(workId, patch) {
    return changePersonal(p => personalData.setRatingDetails(p, workId, patch));
  },

  async unrateWork(workId) {
    return changePersonal(p => personalData.removeRating(p, workId));
  },

  async saveDeclared(patch, step) {
    return changePersonal((p) => {
      personalData.setDeclared(p, patch);
      if (Number.isFinite(step)) p.progress.step = step;
    });
  },

  async setPersonalSettings(patch) {
    return changePersonal((p) => {
      p.settings = { ...p.settings, ...patch };
    });
  },

  async recordRecsShown(ids) {
    return changePersonal((p) => {
      const now = new Date().toISOString();
      ids.forEach((id) => {
        p.recs[id] = { count: (p.recs[id]?.count || 0) + 1, lastShown: now };
      });
      const keys = Object.keys(p.recs);
      if (keys.length > 400) {
        keys.sort((a, b) => (p.recs[a].lastShown || '').localeCompare(p.recs[b].lastShown || ''));
        keys.slice(0, keys.length - 400).forEach((k) => { delete p.recs[k]; });
      }
    });
  },

  async setRecFeedback(work, action) {
    return changePersonal((p) => {
      p.recFeedback[work.id] = {
        action,
        at: new Date().toISOString(),
        work: { id: work.id, title: work.title, authors: (work.authors || []).slice(0, 3), genres: (work.genres || []).slice(0, 3) },
      };
    });
  },

  async clearRecFeedback(workId) {
    return changePersonal((p) => {
      delete p.recFeedback[workId];
    });
  },

  async saveCuratorChat(messages) {
    return changePersonal((p) => {
      p.chat = messages.slice(-60);
    });
  },

  async clearPersonal(part) {
    return changePersonal((p) => {
      const fresh = personalData.emptyPersonal();
      if (part === 'all') {
        Object.assign(p, fresh, { settings: p.settings });
      } else if (part === 'declared') {
        p.declared = fresh.declared;
        p.progress = fresh.progress;
      } else if (part === 'ratings') {
        p.ratings = {};
      } else if (part === 'recs') {
        p.recs = {};
        p.recFeedback = {};
      } else if (part === 'chat') {
        p.chat = [];
      }
    });
  },

  async setReadingAbandoned(bookId, abandoned) {
    return changeReading(log => readingLog.setAbandoned(log, { bookId, abandoned, now: new Date() }));
  },

  async addReadingTime(bookId, seconds) {
    return changeReading(log => readingLog.addTime(log, { bookId, seconds, now: new Date() }));
  },

  async setReadingGoal(target) {
    return changeReading(log => readingLog.setGoal(log, { year: new Date().getFullYear(), target }));
  },

  async getUserProfile() {
    const json = await AsyncStorage.getItem(KEYS.USER);
    return json ? JSON.parse(json) : INITIAL_USER;
  },

  async deleteAllData() {
    const removedFromCloud = await cloud.wipe();
    if (!removedFromCloud) return false;
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify([]));
    await AsyncStorage.removeItem(KEYS.POSITIONS);
    await AsyncStorage.removeItem(KEYS.READING);
    await AsyncStorage.removeItem(KEYS.READER_PREFS);
    await AsyncStorage.removeItem(KEYS.CHARACTERS);
    await AsyncStorage.removeItem(KEYS.CATALOG_HISTORY);
    await AsyncStorage.removeItem(KEYS.PERSONAL);
    return true;
  }
};

[
  'syncFromCloud', 'addBook', 'updateBook', 'setBookContent', 'setBookLocked', 'addChapter', 'updateChapter',
  'moveChapter', 'deleteChapter', 'updateChapterMarks', 'addBookmark', 'addComment', 'removeComment',
  'removeBookmark', 'moveToChest', 'restoreFromChest', 'restoreAllFromChest', 'emptyChest',
  'setReadingPosition', 'setCharacterMap', 'openReading', 'recordReadingStep', 'registerReadingPage', 'setReadingFinished', 'setReadingAbandoned',
  'updatePersonal', 'recordRecsShown', 'setRecFeedback', 'clearRecFeedback', 'saveCuratorChat', 'rateWork', 'rateDetails', 'unrateWork', 'saveDeclared', 'setPersonalSettings', 'clearPersonal',
  'addReadingTime', 'setReadingGoal', 'deleteBookPermanently', 'deleteBooksPermanently', 'deleteAllData',
].forEach((name) => {
  const original = storage[name];
  storage[name] = (...args) => exclusive(() => original.apply(storage, args));
});
