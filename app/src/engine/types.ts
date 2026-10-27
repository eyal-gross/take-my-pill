export interface TimeOfDay {
  h: number;
  m: number;
}

export type SlotKind = 'alarm' | 'banner';

export interface Slot {
  /** Deterministic UUID derived from kind + fire minute. Same slot → same id, always. */
  id: string;
  kind: SlotKind;
  fireAt: Date;
  /** YYYY-MM-DD of the evening that owns this slot ("" for tester slots). */
  cycleKey: string;
}

export interface QuietTime {
  id: string;
  /** YYYY-MM-DD the window starts on (local). */
  dateKey: string;
  from: TimeOfDay;
  /** If `to` <= `from`, the window ends on the next calendar day. */
  to: TimeOfDay;
}

export interface ScheduleInput {
  now: Date;
  notifStart: TimeOfDay;
  alarmStart: TimeOfDay;
  paused: boolean;
  takenOn: string | null;
  quietTimes: QuietTime[];
  testerFrom: number | null;
  testerUntil: number | null;
}
