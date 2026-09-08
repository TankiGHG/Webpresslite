/**
 * Formatting helpers for the German UI. Kept dependency-free so both server
 * and client components can use them; the locale is fixed on purpose because
 * the interface language is.
 */
const LOCALE = 'de-DE';

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const numberFormat = new Intl.NumberFormat(LOCALE);
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

export function formatDate(date: Date | string): string {
  return dateFormat.format(new Date(date));
}

export function formatShortDate(date: Date | string): string {
  return shortDateFormat.format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return dateTimeFormat.format(new Date(date));
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** "vor 3 Minuten", "gestern", "vor 2 Wochen" — for activity lists. */
export function formatRelative(date: Date | string, now = new Date()): string {
  const diff = (new Date(date).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'gerade eben';
  if (abs < 3600) return relativeFormat.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return relativeFormat.format(Math.round(diff / 3600), 'hour');
  if (abs < 7 * 86_400) return relativeFormat.format(Math.round(diff / 86_400), 'day');
  if (abs < 30 * 86_400) return relativeFormat.format(Math.round(diff / (7 * 86_400)), 'week');
  return formatShortDate(date);
}

/** Reading time in minutes, never below one. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const berlinHour = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'Europe/Berlin',
});

/** Time of day greeting. The UI is German, so the clock is German too. */
export function greeting(name: string, now = new Date()): string {
  const hour = Number(berlinHour.format(now));
  const word =
    hour < 5 ? 'Gute Nacht' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first ? `${word}, ${first}` : word;
}
