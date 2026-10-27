import { addDays, atTime, cycleEnd, cycleKeyFor, MINUTE } from './cycle';
import { slotId } from './ids';
import { buildTesterSlots } from './testerSchedule';
import type { QuietTime, ScheduleInput, Slot, TimeOfDay } from './types';

/**
 * Raw slots for one evening, unfiltered:
 *  - banners every 60 min from notifStart while before alarmStart
 *  - from alarmStart: alarm every 60 min, banner 30 min after each alarm
 *  - everything stops at the hard stop (04:00 next day)
 */
export function buildCycleSlots(cycleKey: string, notifStart: TimeOfDay, alarmStart: TimeOfDay): Slot[] {
  const slots: Slot[] = [];
  const end = cycleEnd(cycleKey);
  const alarmAt = atTime(cycleKey, alarmStart);

  let t = atTime(cycleKey, notifStart);
  while (t < alarmAt && t < end) {
    slots.push({ id: slotId('banner', t), kind: 'banner', fireAt: t, cycleKey });
    t = new Date(t.getTime() + 60 * MINUTE);
  }

  let a = alarmAt;
  while (a < end) {
    slots.push({ id: slotId('alarm', a), kind: 'alarm', fireAt: a, cycleKey });
    const b = new Date(a.getTime() + 30 * MINUTE);
    if (b < end) slots.push({ id: slotId('banner', b), kind: 'banner', fireAt: b, cycleKey });
    a = new Date(a.getTime() + 60 * MINUTE);
  }

  return slots;
}

export function quietWindow(q: QuietTime): { start: Date; end: Date } {
  const start = atTime(q.dateKey, q.from);
  const crosses = q.to.h * 60 + q.to.m <= q.from.h * 60 + q.from.m;
  const end = atTime(q.dateKey, q.to, crosses ? 1 : 0);
  return { start, end };
}

export function isInQuietTime(at: Date, quietTimes: QuietTime[]): boolean {
  return quietTimes.some((q) => {
    const { start, end } = quietWindow(q);
    return at >= start && at < end;
  });
}

export function isTesterActive(input: Pick<ScheduleInput, 'now' | 'testerFrom' | 'testerUntil'>): boolean {
  return input.testerFrom !== null && input.testerUntil !== null && input.now.getTime() < input.testerUntil;
}

/**
 * The desired set of future slots right now: today's cycle + tomorrow's, filtered.
 * Pure function — the reconciler turns this into real iOS alarms/notifications.
 */
export function buildSlots(input: ScheduleInput): Slot[] {
  const { now } = input;

  if (isTesterActive(input)) {
    return buildTesterSlots(input.testerFrom!, input.testerUntil!, now);
  }
  if (input.paused) return [];

  const todayKey = cycleKeyFor(now);
  const keys = [todayKey, addDays(todayKey, 1)];
  const out: Slot[] = [];

  for (const key of keys) {
    if (input.takenOn === key) continue;
    for (const slot of buildCycleSlots(key, input.notifStart, input.alarmStart)) {
      if (slot.fireAt.getTime() <= now.getTime()) continue;
      if (isInQuietTime(slot.fireAt, input.quietTimes)) continue;
      out.push(slot);
    }
  }

  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

/** First upcoming slot, or null. */
export function nextSlot(slots: Slot[]): Slot | null {
  return slots.length ? slots[0] : null;
}

/** Tonight's full plan for the timeline UI, with status flags (not filtered by time). */
export interface TimelineEntry extends Slot {
  passed: boolean;
  quiet: boolean;
}

export function buildTonight(input: Omit<ScheduleInput, 'testerFrom' | 'testerUntil' | 'paused' | 'takenOn'>): TimelineEntry[] {
  const key = cycleKeyFor(input.now);
  return buildCycleSlots(key, input.notifStart, input.alarmStart).map((s) => ({
    ...s,
    passed: s.fireAt.getTime() <= input.now.getTime(),
    quiet: isInQuietTime(s.fireAt, input.quietTimes),
  }));
}
