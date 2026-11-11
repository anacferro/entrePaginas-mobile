const MAX_STEP = 2;
const MAX_IDLE_SECONDS = 300;

const pad = (n) => String(n).padStart(2, '0');

export const localDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const emptyLog = () => ({ version: 1, books: {}, days: {}, goal: null });

export function normalizeLog(raw) {
  if (!raw || typeof raw !== 'object') return emptyLog();
  return {
    version: 1,
    books: raw.books && typeof raw.books === 'object' ? raw.books : {},
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
    goal: raw.goal && Number.isFinite(raw.goal.target) ? raw.goal : null,
  };
}

function entryOf(log, bookId, now) {
  if (!log.books[bookId]) {
    log.books[bookId] = { startedAt: now.toISOString(), lastReadAt: null, finishedAt: null, credited: 0, seconds: 0 };
  }
  return log.books[bookId];
}

function dayEntry(log, bookId, now) {
  const key = localDay(now);
  if (!log.days[key]) log.days[key] = {};
  if (!log.days[key][bookId]) log.days[key][bookId] = { pages: 0, seconds: 0 };
  return log.days[key][bookId];
}

export function openBook(log, { bookId, position, total, now }) {
  if (log.books[bookId]) return log;
  const entry = entryOf(log, bookId, now);
  if (position > 1) {
    entry.startedAt = null;
    entry.credited = Math.min(position, total);
  } else {
    credit(log, bookId, 1, 0, total, now);
  }
  return log;
}

function credit(log, bookId, upTo, floor, total, now) {
  const entry = entryOf(log, bookId, now);
  const gained = Math.max(0, upTo - Math.max(floor, entry.credited));
  entry.credited = Math.max(entry.credited, Math.min(upTo, total));
  entry.lastReadAt = now.toISOString();
  if (gained > 0) dayEntry(log, bookId, now).pages += gained;
  if (upTo >= total && total > 0 && !entry.finishedAt) entry.finishedAt = now.toISOString();
  return gained;
}

export function recordPageChange(log, { bookId, from, to, total, now }) {
  const entry = entryOf(log, bookId, now);
  const step = to - from;
  if (step >= 1 && step <= MAX_STEP) {
    credit(log, bookId, to, from, total, now);
  } else {
    entry.lastReadAt = now.toISOString();
  }
  return log;
}

export function registerPage(log, { bookId, page, total, now }) {
  const target = Math.max(1, Math.min(page, total));
  credit(log, bookId, target, 0, total, now);
  return log;
}

export function setFinished(log, { bookId, finished, total, now }) {
  const entry = entryOf(log, bookId, now);
  if (finished) {
    credit(log, bookId, total, 0, total, now);
    entry.finishedAt = entry.finishedAt || now.toISOString();
  } else {
    entry.finishedAt = null;
  }
  return log;
}

export function addTime(log, { bookId, seconds, now }) {
  const safe = Math.max(0, Math.min(Math.round(seconds), MAX_IDLE_SECONDS));
  if (safe === 0) return log;
  const entry = entryOf(log, bookId, now);
  entry.seconds = (entry.seconds || 0) + safe;
  dayEntry(log, bookId, now).seconds += safe;
  return log;
}

export function dropBooks(log, ids) {
  ids.forEach((id) => {
    delete log.books[id];
    Object.keys(log.days).forEach((day) => {
      delete log.days[day][id];
      if (Object.keys(log.days[day]).length === 0) delete log.days[day];
    });
  });
  return log;
}

export function setGoal(log, { year, target }) {
  log.goal = target > 0 ? { year, target: Math.round(target) } : null;
  return log;
}
