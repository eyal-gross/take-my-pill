import { MINUTE } from './cycle';
import { slotId } from './ids';
import type { Slot } from './types';

export const TESTER_DURATION_MS = 60 * MINUTE;

/**
 * Compressed schedule for testing: from the toggle moment, alarm at +1 min, banner at +2,
 * alarm at +3 … for one hour (30 alarms, 30 banners). Only future slots are returned.
 */
export function buildTesterSlots(fromMs: number, untilMs: number, now: Date): Slot[] {
  const slots: Slot[] = [];
  for (let i = 1; i <= 60; i++) {
    const fireMs = fromMs + i * MINUTE;
    if (fireMs > untilMs) break;
    if (fireMs <= now.getTime()) continue;
    const fireAt = new Date(fireMs);
    const kind = i % 2 === 1 ? 'alarm' : 'banner';
    slots.push({ id: slotId(kind, fireAt), kind, fireAt, cycleKey: '' });
  }
  return slots;
}
