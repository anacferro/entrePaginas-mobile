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

export function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
