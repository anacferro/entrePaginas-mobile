import { localDay } from './readingLog';

const DAY_MS = 86400000;

export const STATUS = { PLANNED: 'planejado', READING: 'lendo', FINISHED: 'lido', ABANDONED: 'abandonado' };

export const STATUS_LABELS = {
  [STATUS.PLANNED]: 'Quero ler',
  [STATUS.READING]: 'Lendo',
  [STATUS.FINISHED]: 'Lido',
  [STATUS.ABANDONED]: 'Abandonado',
};

export function statusOf(book, position, entry) {
  if (entry?.finishedAt) return STATUS.FINISHED;
  if (entry?.abandonedAt) return STATUS.ABANDONED;
  if (entry || position > 1) return STATUS.READING;
  return STATUS.PLANNED;
}

export function progressOf(book, position, entry) {
  const total = Math.max(1, book.totalPages || 1);
  const status = statusOf(book, position, entry);
  const page = status === STATUS.FINISHED ? total : Math.max(1, Math.min(position || 1, total));
  const percent = status === STATUS.PLANNED ? 0 : Math.round((page / total) * 100);
  return { status, page, total, percent: Math.min(100, percent) };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function dayTotals(log, key, bookIds) {
  const day = log.days[key];
  if (!day) return { pages: 0, seconds: 0 };
  return Object.keys(day).reduce(
    (sum, id) => (bookIds && !bookIds.has(id) ? sum : { pages: sum.pages + day[id].pages, seconds: sum.seconds + day[id].seconds }),
    { pages: 0, seconds: 0 }
  );
}

function sumRange(log, from, to, bookIds) {
  let pages = 0;
  let seconds = 0;
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
    const totals = dayTotals(log, localDay(d), bookIds);
    pages += totals.pages;
    seconds += totals.seconds;
  }
  return { pages, seconds };
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function computeStats({ books, positions, log, now }) {
  const ids = new Set(books.map((b) => b.id));
  const today = startOfDay(now);
  const counts = { [STATUS.PLANNED]: 0, [STATUS.READING]: 0, [STATUS.FINISHED]: 0, [STATUS.ABANDONED]: 0 };
  let pagesRead = 0;
  let finishedThisYear = 0;
  let finishedLastYear = 0;

  books.forEach((book) => {
    const entry = log.books[book.id];
    counts[statusOf(book, positions[book.id] || 1, entry)] += 1;
    pagesRead += entry?.credited || 0;
    if (entry?.finishedAt) {
      const year = new Date(entry.finishedAt).getFullYear();
      if (year === now.getFullYear()) finishedThisYear += 1;
      if (year === now.getFullYear() - 1) finishedLastYear += 1;
    }
  });

  const last30 = sumRange(log, addDays(today, -29), now, ids);
  const week = sumRange(log, addDays(today, -6), now, ids);
  const todayTotals = dayTotals(log, localDay(today), ids);

  let firstDay = null;
  Object.keys(log.days).forEach((key) => {
    const hasBook = Object.keys(log.days[key]).some((id) => ids.has(id));
    if (hasBook && (!firstDay || key < firstDay)) firstDay = key;
  });
  let windowDays = 0;
  if (firstDay) {
    const [y, m, d] = firstDay.split('-').map(Number);
    const spanned = Math.floor((today - new Date(y, m - 1, d)) / DAY_MS) + 1;
    windowDays = Math.max(1, Math.min(30, spanned));
  }

  const daily = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const totals = dayTotals(log, localDay(day), ids);
    daily.push({ key: localDay(day), label: WEEKDAYS[day.getDay()], value: totals.pages, seconds: totals.seconds });
  }

  const monthly = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const totals = sumRange(log, start, end, ids);
    monthly.push({
      key: `${start.getFullYear()}-${start.getMonth() + 1}`,
      label: MONTHS[start.getMonth()],
      value: totals.pages,
      seconds: totals.seconds,
    });
  }

  const thisMonth = monthly[monthly.length - 1].value;
  const lastMonth = monthly[monthly.length - 2].value;

  const goal = log.goal && log.goal.year === now.getFullYear() ? log.goal : null;

  return {
    counts,
    totalBooks: books.length,
    pagesRead,
    seconds: books.reduce((sum, b) => sum + (log.books[b.id]?.seconds || 0), 0),
    pagesToday: todayTotals.pages,
    pagesWeek: week.pages,
    secondsWeek: week.seconds,
    pagesPerDay: windowDays ? last30.pages / windowDays : 0,
    daily,
    monthly,
    hasActivity: daily.some((d) => d.value > 0) || monthly.some((m) => m.value > 0),
    comparison: { thisMonth, lastMonth, finishedThisYear, finishedLastYear },
    goal: goal
      ? { year: goal.year, target: goal.target, done: finishedThisYear, remaining: Math.max(0, goal.target - finishedThisYear) }
      : null,
  };
}

export function recentActivity({ books, positions, log, limit = 6 }) {
  const events = [];
  books.forEach((book) => {
    const entry = log.books[book.id];
    if (book.createdAt) events.push({ id: `add-${book.id}`, bookId: book.id, title: book.title, at: book.createdAt, kind: 'added' });
    if (entry?.startedAt) events.push({ id: `start-${book.id}`, bookId: book.id, title: book.title, at: entry.startedAt, kind: 'started' });
    if (entry?.finishedAt) {
      events.push({ id: `end-${book.id}`, bookId: book.id, title: book.title, at: entry.finishedAt, kind: 'finished' });
    } else if (entry?.lastReadAt) {
      events.push({
        id: `read-${book.id}`,
        bookId: book.id,
        title: book.title,
        at: entry.lastReadAt,
        kind: 'progress',
        page: Math.min(positions[book.id] || 1, book.totalPages || 1),
      });
    }
  });
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function bookForecast({ book, entry, log, now }) {
  if (!entry || entry.finishedAt) return null;
  const total = Math.max(1, book.totalPages || 1);
  const remaining = total - Math.min(entry.credited || 0, total);
  if (remaining <= 0) return null;
  const activeDays = Object.keys(log.days).filter((key) => log.days[key][book.id]?.pages > 0);
  if (activeDays.length < 2) return null;
  const pages = activeDays.reduce((sum, key) => sum + log.days[key][book.id].pages, 0);
  const perDay = pages / activeDays.length;
  if (perDay <= 0) return null;
  const days = Math.ceil(remaining / perDay);
  return { perDay, days, date: addDays(startOfDay(now), days) };
}

export function formatDuration(totalSeconds) {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) return totalSeconds > 0 ? '<1 min' : '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatRelative(value, now) {
  const date = new Date(value);
  const days = Math.floor((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return formatDate(date);
}
