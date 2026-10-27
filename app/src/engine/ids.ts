import type { SlotKind } from './types';

/**
 * Deterministic UUID-shaped id from (kind, fire minute).
 * Layout: 0000000K-MMMM-MMMM-MM00-000000000000 where K = 1 alarm / 2 banner and
 * M… = epoch minutes zero-padded to 10 digits. Digits only, so always valid hex.
 * Re-running the engine yields identical ids, which is what lets reconcile() diff
 * against what iOS already has without ever duplicating an alarm.
 */
export function slotId(kind: SlotKind, fireAt: Date): string {
  const k = kind === 'alarm' ? '1' : '2';
  const minutes = String(Math.floor(fireAt.getTime() / 60_000)).padStart(10, '0');
  return `0000000${k}-${minutes.slice(0, 4)}-${minutes.slice(4, 8)}-${minutes.slice(8, 10)}00-000000000000`;
}

export function parseSlotId(id: string): { kind: SlotKind; fireAt: Date } | null {
  const m = /^0000000([12])-(\d{4})-(\d{4})-(\d{2})00-000000000000$/i.exec(id);
  if (!m) return null;
  const minutes = Number(`${m[2]}${m[3]}${m[4]}`);
  return { kind: m[1] === '1' ? 'alarm' : 'banner', fireAt: new Date(minutes * 60_000) };
}

export function isOurSlotId(id: string): boolean {
  return parseSlotId(id) !== null;
}
