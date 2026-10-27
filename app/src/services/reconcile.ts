import { atTime, cycleKeyFor } from '../engine/cycle';
import { quietWindow } from '../engine/schedule';
import { buildSlots } from '../engine/schedule';
import type { Slot, TimeOfDay } from '../engine/types';
import { tierForHoursIntoNight, type FunnyTier } from '../i18n/funny';
import { useAppStore } from '../store/useAppStore';
import { Alarms } from './alarms';
import { Banners } from './banners';
import { isPreviewAlarm } from './previewAlarm';

/**
 * The single entry point that makes the phone match the plan.
 * desired = engine output; actual = what iOS has; cancel extras; schedule missing.
 * Idempotent and serialized, so it can be called on every state change without care.
 */
let chain: Promise<void> = Promise.resolve();

export function reconcile(now: Date = new Date()): Promise<void> {
  chain = chain.then(() => run(now)).catch((e) => console.warn('[reconcile] failed', e));
  return chain;
}

async function run(now: Date): Promise<void> {
  const s = useAppStore.getState();
  if (!s.hydrated || !s.onboarded) return;

  s.clearExpiredTester(now);
  const state = useAppStore.getState();

  // A snooze replaces the alarms/banners inside its window (native list); don't re-create those.
  const skipped = Alarms.listSkipped();
  const planned = buildSlots({
    now,
    notifStart: state.notifStart,
    alarmStart: state.alarmStart,
    paused: state.paused,
    takenOn: state.takenOn,
    quietTimes: state.quietTimes,
    testerFrom: state.testerFrom,
    testerUntil: state.testerUntil,
  });
  const desired = planned.filter((d) => !skipped.has(d.id.toLowerCase()));
  const desiredIds = new Set(desired.map((d) => d.id));

  const alarmsAuthorized = Alarms.available() && Alarms.authorizationState() === 'authorized';

  const [alarmIds, bannerIds] = await Promise.all([
    alarmsAuthorized ? Alarms.listScheduled() : Promise.resolve<string[]>([]),
    Banners.listScheduledIds(),
  ]);

  // A ringing or snoozed (counting down) alarm is no longer "planned" (its time passed) but must
  // stay - unless she took the pill, paused, or a quiet time began. Cancelling also ends the countdown.
  const keepActive = activeAlarmsToKeep(state, now);

  // 1. cancel what should no longer fire
  await Promise.all([
    ...alarmIds.filter((id) => !desiredIds.has(id) && !isPreviewAlarm(id) && !keepActive.has(id)).map((id) => Alarms.cancel(id).catch(() => undefined)),
    ...bannerIds.filter((id) => !desiredIds.has(id)).map((id) => Banners.cancel(id).catch(() => undefined)),
  ]);

  // 2. schedule what is missing
  const have = new Set([...alarmIds, ...bannerIds]);
  const testerSlots = desired.filter((d) => d.cycleKey === '');
  for (const slot of desired) {
    if (have.has(slot.id)) continue;
    try {
      if (slot.kind === 'alarm') {
        if (alarmsAuthorized) await Alarms.schedule(slot, state.language, state.sound, state.snoozeMinutes);
      } else {
        await Banners.schedule(slot, state.language, { name: state.name, tier: tierFor(slot, state.notifStart, testerSlots) });
      }
    } catch (e) {
      console.warn('[reconcile] schedule failed', slot.kind, slot.fireAt.toISOString(), e);
    }
  }

  if (__DEV__) {
    console.log(
      `[reconcile] desired=${desired.length} (alarms ${desired.filter((d) => d.kind === 'alarm').length}) ` +
        `had alarms=${alarmIds.length} banners=${bannerIds.length} alarmsAuthorized=${alarmsAuthorized}`,
    );
  }
}

function activeAlarmsToKeep(state: ReturnType<typeof useAppStore.getState>, now: Date): Set<string> {
  const inQuiet = state.quietTimes.map(quietWindow).some((w) => now >= w.start && now < w.end);
  if (state.paused || inQuiet || state.takenOn === cycleKeyFor(now)) return new Set();
  const keep = new Set<string>();
  for (const [id, st] of Alarms.listAlarmStates()) {
    if (st === 'countdown' || st === 'alerting' || st === 'paused') keep.add(id);
  }
  return keep;
}

/**
 * Which nagging tier a banner belongs to. Normal nights: by hours since the first reminder.
 * Tester mode (no cycle key): walk through early → mid → late across the hour so every tier gets heard.
 */
function tierFor(slot: Slot, notifStart: TimeOfDay, testerSlots: Slot[]): FunnyTier {
  if (slot.cycleKey === '') {
    const i = testerSlots.findIndex((s) => s.id === slot.id);
    const third = Math.max(1, Math.ceil(testerSlots.length / 3));
    return i < third ? 'early' : i < third * 2 ? 'mid' : 'late';
  }
  const start = atTime(slot.cycleKey, notifStart).getTime();
  return tierForHoursIntoNight((slot.fireAt.getTime() - start) / 3_600_000);
}

/**
 * Alarm titles/buttons and banner texts are baked in at schedule time, so a language or sound
 * change must re-create everything. Cancel all ours, then reconcile.
 */
export async function rescheduleEverything(): Promise<void> {
  chain = chain
    .then(async () => {
      const s = useAppStore.getState();
      if (Alarms.available() && Alarms.authorizationState() === 'authorized') {
        // Not cancelAll: a Normal-sound test alarm may be about to ring, and a ringing / snoozed alarm
        // must survive (it keeps its old texts and sound until it is done; it is a one-off).
        const ids = await Alarms.listScheduled().catch(() => [] as string[]);
        const keepActive = activeAlarmsToKeep(s, new Date());
        await Promise.all(
          ids.filter((id) => !isPreviewAlarm(id) && !keepActive.has(id)).map((id) => Alarms.cancel(id).catch(() => undefined)),
        );
      }
      const ours = await Banners.listScheduledIds();
      await Promise.all(ours.map((id) => Banners.cancel(id).catch(() => undefined)));
      Alarms.syncStrings(s.language);
    })
    .then(() => run(new Date()))
    .catch((e) => console.warn('[reconcile] reschedule failed', e));
  return chain;
}
