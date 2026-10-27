import type { TimeOfDay } from './types';

/** The night ends here, no matter what. */
export const HARD_STOP: TimeOfDay = { h: 4, m: 0 };

export const MINUTE = 60_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-date key YYYY-MM-DD. */
export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD into a local Date at midnight. */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function addDays(key: string, n: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + n);
  return dateKeyOf(d);
}

/** Local Date for `time` on the day `key` (+ optional day offset). DST-safe because we build from components. */
export function atTime(key: string, time: TimeOfDay, dayOffset = 0): Date {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(time.h, time.m, 0, 0);
  return d;
}

/**
 * Which "evening" owns this moment. Between midnight and the hard stop the night still
 * belongs to yesterday's date. From the hard stop onward it is today's (upcoming) cycle,
 * so a "Took it!" tapped at 15:00 counts for tonight.
 */
export function cycleKeyFor(now: Date): string {
  const key = dateKeyOf(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const stop = HARD_STOP.h * 60 + HARD_STOP.m;
  return minutes < stop ? addDays(key, -1) : key;
}

export function cycleEnd(key: string): Date {
  return atTime(key, HARD_STOP, 1);
}

export function timeOfDayToMinutes(t: TimeOfDay): number {
  return t.h * 60 + t.m;
}

/** Valid when the first reminder comes strictly before the first alarm, same evening. */
export function isValidSchedule(notifStart: TimeOfDay, alarmStart: TimeOfDay): boolean {
  return timeOfDayToMinutes(notifStart) < timeOfDayToMinutes(alarmStart);
}
