import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type AlarmAuthorizationState = 'notDetermined' | 'authorized' | 'denied' | 'unavailable' | 'unknown';

export interface ScheduleAlarmOptions {
  /** UUID string, deterministic per slot (see src/engine/ids.ts). */
  id: string;
  /** ms since epoch */
  fireAt: number;
  title: string;
  buttonText: string;
  /** SF Symbol name for the secondary button */
  buttonSymbol?: string;
  /** Bundle sound file name incl. extension (e.g. "gentle.caf"), or empty string for the system default. */
  sound?: string;
  tintHex?: string;
  /** >0: iOS Snooze with a countdown of this many minutes. 0: test alarm, Stop only. */
  snoozeMinutes?: number;
  /** App language + countdown texts, drawn by the snooze Live Activity. */
  lang?: string;
  countdownTitle?: string;
  ringsInLabel?: string;
  stopLabel?: string;
}

export type AlarmState = 'scheduled' | 'countdown' | 'paused' | 'alerting' | 'unknown';

export interface AlarmIntentEvent {
  action: 'stopped' | 'opened' | 'snoozed' | 'snoozeStopped';
  /** For 'snoozed': when it rings again (ms since epoch). */
  until?: number;
  alarmId: string;
  /** ms since epoch */
  at: number;
}

interface NativePillAlarm {
  isAvailable(): boolean;
  requestAuthorization(): Promise<AlarmAuthorizationState>;
  authorizationState(): AlarmAuthorizationState;
  schedule(options: Required<ScheduleAlarmOptions>): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
  listScheduled(): Promise<string[]>;
  listAlarms?(): string[];
  listSkipped?(): string[];
  setStrings(strings: { tapToOpenTitle: string; tapToOpenBody: string }): void;
  drainEvents(): AlarmIntentEvent[];
}

const native = Platform.OS === 'ios' ? requireOptionalNativeModule<NativePillAlarm>('PillAlarm') : null;

/** True when running in a dev/TestFlight build that contains the AlarmKit core. False in Expo Go / web. */
export const isAlarmKitAvailable = (): boolean => {
  try {
    return !!native && native.isAvailable();
  } catch {
    return false;
  }
};

export const PillAlarm = {
  requestAuthorization: async (): Promise<AlarmAuthorizationState> => {
    if (!native) return 'unavailable';
    return native.requestAuthorization();
  },
  authorizationState: (): AlarmAuthorizationState => {
    if (!native) return 'unavailable';
    try {
      return native.authorizationState();
    } catch {
      return 'unknown';
    }
  },
  schedule: async (options: ScheduleAlarmOptions): Promise<void> => {
    if (!native) return;
    await native.schedule({
      buttonSymbol: 'pills.fill',
      sound: '',
      tintHex: '#E88A9A',
      snoozeMinutes: 0,
      lang: 'en',
      countdownTitle: '',
      ringsInLabel: '',
      stopLabel: '',
      ...options,
    });
  },
  cancel: async (id: string): Promise<void> => {
    if (!native) return;
    await native.cancel(id);
  },
  cancelAll: async (): Promise<void> => {
    if (!native) return;
    await native.cancelAll();
  },
  listScheduled: async (): Promise<string[]> => {
    if (!native) return [];
    return (await native.listScheduled()).map((id) => id.toLowerCase());
  },
  /** State of every alarm iOS holds. Older builds lack the function: empty map. */
  listAlarmStates: (): Map<string, AlarmState> => {
    const out = new Map<string, AlarmState>();
    if (!native?.listAlarms) return out;
    try {
      for (const row of native.listAlarms()) {
        const [id, state] = row.split('|');
        out.set(id.toLowerCase(), (state as AlarmState) ?? 'unknown');
      }
    } catch {}
    return out;
  },
  /** Alarm and banner ids a snooze replaced. Older builds: empty. */
  listSkipped: (): Set<string> => {
    if (!native?.listSkipped) return new Set();
    try {
      return new Set(native.listSkipped().map((id) => id.toLowerCase()));
    } catch {
      return new Set();
    }
  },
  setStrings: (strings: { tapToOpenTitle: string; tapToOpenBody: string }): void => {
    native?.setStrings(strings);
  },
  drainEvents: (): AlarmIntentEvent[] => {
    if (!native) return [];
    try {
      return native.drainEvents();
    } catch {
      return [];
    }
  },
};
